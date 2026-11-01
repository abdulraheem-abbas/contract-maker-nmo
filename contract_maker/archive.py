"""Local version history, copies and named color tags; existing Word files stay intact."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import uuid
from . import store
from .fields import empty_fields


def group_id(job):
    return job.get('person_id') or job['id']


def _jobs():
    with store.connection() as db:
        return [json.loads(row['content']) for row in db.execute('SELECT content FROM jobs')]


def members(person):
    result=[job for job in _jobs() if group_id(job)==person]
    if not result:raise ValueError('This contract history was not found.')
    return result


def _file(job, name):
    if Path(name).name!=name or '\\' in name or not name.lower().endswith('.docx'):
        raise ValueError('Choose an available Word version.')
    path=store.DATA/'outputs'/job['id']/name
    if not path.is_file():raise ValueError('This Word version could not be found.')
    return path


def version_info(job):
    """Read legacy per-export records without modifying their files or stored fields."""
    metadata={r['name']:r for r in job.get('revisions',[]) if isinstance(r,dict) and r.get('name')}
    names=list(dict.fromkeys([n for n in job.get('outputs',[]) if n.lower().endswith('.docx')]+list(metadata)))
    result=[]
    for index,name in enumerate(names,1):
        item=deepcopy(metadata.get(name,{}));item.update(name=name,job=job['id'])
        item.setdefault('number',index);item.setdefault('origin','legacy')
        path=store.DATA/'outputs'/job['id']/name
        created=item.get('created')
        if not created:
            if path.is_file():
                stat=path.stat();created=datetime.fromtimestamp(getattr(stat,'st_birthtime',stat.st_mtime),timezone.utc).isoformat()
                item['estimated_time']=True
            else:created=job.get('created') or job.get('last_exported') or ''
        item['created']=created
        evidence={}
        snapshot=item.get('fields_snapshot')
        if snapshot is None and item['origin']=='generated':
            record=store.DATA/'records'/job['id']/f"revision-{int(item['number'])}.json"
            if record.is_file():
                try:
                    evidence=json.loads(record.read_text())
                    if not item.get('sha256') or evidence.get('sha256')==item['sha256']:
                        snapshot=evidence.get('confirmed_fields')
                except (OSError,ValueError,TypeError):pass
            if snapshot is None and name==(job.get('outputs') or [None])[-1]:
                latest=job.get('last_generation',{})
                if latest.get('sha256')==item.get('sha256') and item.get('sha256'):
                    snapshot=latest.get('confirmed_fields')
        item['template_snapshot']=deepcopy(item.get('template_snapshot') or evidence.get('template') or (job.get('last_generation',{}).get('template') if job.get('last_generation',{}).get('sha256')==item.get('sha256') else None))
        item['fields_snapshot']=deepcopy(snapshot) if isinstance(snapshot,dict) else None
        item['source_ids']=deepcopy(item.get('source_ids',job.get('sources',[])))
        item['kind']=(snapshot or {}).get('contract_type',{}).get('value') or item.get('kind') or job.get('fields',{}).get('contract_type',{}).get('value','employment')
        item['archive_only']=item['fields_snapshot'] is None
        item['title']=item.get('title') or job.get('last_exported_title') or job['title']
        item['available']=path.is_file()
        result.append(item)
    return result


def _rank_versions(jobs):
    versions=[item for job in jobs if not job.get('edit_shadow') for item in version_info(job)]
    versions.sort(key=lambda r:(r['created'],r['job'],r['number'],r['name']))
    for number,item in enumerate(versions,1):item['version']=number
    return versions


def group_versions(person):
    return _rank_versions(members(person))



def display_name(item):
    prefix={'employment':'عقد عمل','service':'عقد خدمة','extension':'خطاب تمديد'}.get(item['kind'],'Contract')
    name=(item.get('fields_snapshot') or {}).get('name_ar',{}).get('value') or item['title']
    name=re.sub(r'[\\/:*?"<>|\x00-\x1f]','-',name).strip()[:120]
    return f"{prefix} - {name} - v{item.get('version',item['number'])}.docx"


def output_labels(job):
    if not job.get('outputs'):return {}
    if job.get('edit_shadow'):
        return {v['name']:display_name({**v,'version':job.get('editing_version',v['number'])}) for v in version_info(job)}
    return {v['name']:display_name(v) for v in group_versions(group_id(job)) if v['job']==job['id']}


def _public(item):
    return {key:value for key,value in item.items() if key not in {'fields_snapshot','source_ids'}}|{'display_name':display_name(item),'can_edit_fields':item['fields_snapshot'] is not None and item['available']}


def tags():
    with store.connection() as db:
        return [dict(row) for row in db.execute('SELECT id,name,color,created FROM tags ORDER BY name COLLATE NOCASE,id')]


def _tag_ids(person):
    with store.connection() as db:return [row['tag_id'] for row in db.execute('SELECT tag_id FROM group_tags WHERE group_id=?',(person,))]


def completed():
    groups={}
    for job in _jobs():groups.setdefault(group_id(job),[]).append(job)
    result=[]
    for person,jobs in groups.items():
        versions=[item for item in _rank_versions(jobs) if not item.get('deleted_at') and item['available']]
        if not versions:continue
        versions.sort(key=lambda r:(r['created'],r['job'],r['number'],r['name']))
        latest=versions[-1];job=next(j for j in jobs if j['id']==latest['job'])
        def summary(item):return {'id':item['job'],'kind':item['kind'],'latest_word':item['name'],'latest_label':display_name(item),'last_exported':item['created'],'archive_only':item['archive_only']}
        by_kind={item['kind']:summary(item) for item in versions}
        changed=False
        for member in jobs:
            snapshot=member.get('last_generation',{}).get('confirmed_fields',{})
            changed|=bool(snapshot and any(str(field.get('value',''))!=str(snapshot.get(key,{}).get('value','')) for key,field in member.get('fields',{}).items()))
        result.append({**summary(latest),'group_id':person,'title':job.get('display_title') or latest['title'],'word_count':len(versions),'created':min(j.get('created',latest['created']) for j in jobs),'updated':max(v.get('updated',v['created']) for v in versions),'has_changes':changed,'tag_ids':_tag_ids(person),'by_kind':by_kind,'copied':bool(job.get('copied_from'))})
    return sorted(result,key=lambda r:(r['last_exported'],r['group_id']),reverse=True)



def trashed():
    groups={}
    for job in _jobs():
        if not job.get('edit_shadow'):groups.setdefault(group_id(job),[]).append(job)
    result=[]
    for person,jobs in groups.items():
        deleted=[v for job in jobs for v in version_info(job) if v.get('deleted_at')]
        if deleted:result.append({'group_id':person,'title':history(person)['title'],'count':len(deleted),'deleted_at':max(v['deleted_at'] for v in deleted)})
    return sorted(result,key=lambda v:v['deleted_at'],reverse=True)


def history(person):
    jobs=members(person);versions=_rank_versions(jobs)
    active=[v for v in versions if not v.get('deleted_at') and v['available']]
    latest=active[-1] if active else None
    owner=next((j for j in jobs if latest and j['id']==latest['job']),jobs[0])
    return {'group_id':person,'title':owner.get('display_title') or (latest or {}).get('title') or owner['title'],'created':min(j.get('created','') for j in jobs),'tag_ids':_tag_ids(person),'versions':[{**_public(v),'latest':bool(latest and v['job']==latest['job'] and v['name']==latest['name'])} for v in reversed(versions)]}


def selected(job_id,name,include_deleted=False):
    job=store.get_job(job_id)
    item=next((r for r in version_info(job) if r['name']==name),None)
    if not item or (item.get('deleted_at') and not include_deleted):raise ValueError('Choose an available Word version.')
    return job,item


def _check_bytes(job,item):
    raw=_file(job,item['name']).read_bytes()
    if item.get('sha256') and hashlib.sha256(raw).hexdigest()!=item['sha256']:
        raise ValueError('This Word version changed outside the app. Upload it as a new version before copying its saved details.')
    return raw


def _copy_job(source,item,same_person,with_word):
    snapshot=deepcopy(item['fields_snapshot'])
    if snapshot and not same_person:
        for field in snapshot.values():field['evidence']=[];field.pop('note',None)
    values=empty_fields()
    if snapshot:
        for key,field in snapshot.items():
            if key in values:values[key]=deepcopy(field);values[key]['confirmed']=False
    else:values['contract_type'].update(value=item['kind'],confirmed=True,origin='chosen by you')
    identifier=uuid.uuid4().hex
    job={'id':identifier,'person_id':group_id(source) if same_person else identifier,'title':item['title'],'fields':values,'sources':deepcopy(item['source_ids']) if snapshot and same_person else [],'findings':[],'outputs':[],'created':store.now(),'mode':'create','archive_only':not bool(snapshot),'copied_from':{'job':source['id'],'name':item['name']}}
    if item.get('template_snapshot'):job['template_reference']={**deepcopy(item['template_snapshot']),'kind':item['kind']}
    if same_person and source.get('display_title'):job['display_title']=source['display_title']
    if with_word:
        raw=_check_bytes(source,item);folder=store.DATA/'outputs'/identifier;folder.mkdir(parents=True)
        name='v1.docx';(folder/name).write_bytes(raw)
        created=store.now();meta={'name':name,'number':1,'created':created,'duplicated_at':created,'origin':'duplicated','sha256':hashlib.sha256(raw).hexdigest(),'fields_snapshot':deepcopy(snapshot),'source_ids':deepcopy(job['sources']),'kind':item['kind'],'title':item['title'],'template_snapshot':deepcopy(item.get('template_snapshot'))}
        job.update(outputs=[name],revisions=[meta],last_exported=created,last_exported_title=item['title'],last_word_origin='duplicated')
        if snapshot:job['last_generation']={'confirmed_fields':deepcopy(snapshot)}
    else:
        _check_bytes(source,item)
        if not snapshot:raise ValueError('This version has no saved form details. Edit its Word file and upload the edited version.')
        number=next(v['version'] for v in group_versions(group_id(source)) if v['job']==source['id'] and v['name']==item['name'])
        job['editing_version']=number
    store.save_job(job)
    if not same_person:
        with store.connection() as db:
            for tag in _tag_ids(group_id(source)):db.execute('INSERT OR IGNORE INTO group_tags VALUES (?,?)',(identifier,tag))
    store.audit(identifier,'version_copied' if with_word else 'version_edit_started',{'source_job':source['id'],'source_name':item['name'],'same_person':same_person})
    return job


def duplicate(job_id,name,mode):
    if mode not in {'same_person','separate'}:raise ValueError('Choose where to duplicate this version.')
    job,item=selected(job_id,name)
    return _copy_job(job,item,mode=='same_person',True)


def edit_version(job_id,name,mode='copy'):
    if mode not in {'copy','replace'}:raise ValueError('Choose how to save the edited version.')
    job,item=selected(job_id,name)
    draft=_copy_job(job,item,True,False)
    if mode=='replace':
        draft['editing_target']={'job':job_id,'name':name,'expected_sha':hashlib.sha256(_check_bytes(job,item)).hexdigest()}
        store.save_job(draft)
    return draft


def replace_edited_version(draft,path,verification):
    """Commit an explicit in-place edit; retain creation time and a local undo copy."""
    target=draft.get('editing_target')
    if not target:return
    owner,item=selected(target['job'],target['name'])
    old=_check_bytes(owner,item)
    if hashlib.sha256(old).hexdigest()!=target['expected_sha']:
        raise ValueError('This version changed while you were editing it. Start a new copy from its history.')
    raw=path.read_bytes();stamp=store.now()
    backup=store.DATA/'records'/owner['id']/'edit-backups';backup.mkdir(parents=True,exist_ok=True)
    backup_id=uuid.uuid4().hex
    (backup/(backup_id+'.docx')).write_bytes(old)
    (backup/(backup_id+'.json')).write_text(json.dumps(item,ensure_ascii=False))
    destination=_file(owner,item['name']);temporary=destination.with_suffix('.'+uuid.uuid4().hex+'.tmp')
    try:temporary.write_bytes(raw);os.replace(temporary,destination)
    finally:temporary.unlink(missing_ok=True)
    record=next((r for r in owner.setdefault('revisions',[]) if r['name']==item['name']),None)
    if record is None:
        record={k:v for k,v in item.items() if k not in {'job','available','archive_only','version'}};owner['revisions'].append(record)
    record.update(updated=stamp,origin='generated',sha256=verification['sha256'],fields_snapshot=deepcopy(draft['fields']),source_ids=deepcopy(draft['sources']),kind=draft['fields']['contract_type']['value'],title=draft['title'],template_snapshot=deepcopy(verification.get('template')))
    if item['name']==(owner.get('outputs') or [None])[-1]:
        previous=owner.get('last_generation',{}).get('confirmed_fields',{})
        has_draft=bool(previous and any(f.get('value')!=previous.get(k,{}).get('value') for k,f in owner['fields'].items()))
        if not has_draft:owner['fields']=deepcopy(draft['fields']);owner['title']=draft['title'];owner['sources']=deepcopy(draft['sources'])
        owner['last_generation']=deepcopy(verification);owner['last_exported_title']=draft['title']
    store.save_job(owner)
    draft['edit_shadow']=True;target['expected_sha']=verification['sha256']
    store.audit(owner['id'],'version_updated',{'name':item['name'],'backup':backup_id})



def replace_uploaded_version(job_id,name,raw,expected_sha=None):
    job,item=selected(job_id,name);old=_check_bytes(job,item)
    if expected_sha and hashlib.sha256(old).hexdigest()!=expected_sha:
        raise ValueError('This version changed while you were editing it. Start a new copy from its history.')
    backup=store.DATA/'records'/job_id/'edit-backups';backup.mkdir(parents=True,exist_ok=True)
    backup_id=uuid.uuid4().hex;(backup/(backup_id+'.docx')).write_bytes(old)
    (backup/(backup_id+'.json')).write_text(json.dumps(item,ensure_ascii=False))
    path=_file(job,name);temporary=path.with_suffix('.'+uuid.uuid4().hex+'.tmp')
    try:temporary.write_bytes(raw);os.replace(temporary,path)
    finally:temporary.unlink(missing_ok=True)
    record=next((r for r in job.setdefault('revisions',[]) if r['name']==name),None)
    if record is None:
        record={k:v for k,v in item.items() if k not in {'job','available','archive_only','version'}};job['revisions'].append(record)
    record.update(updated=store.now(),origin='uploaded_word',fields_snapshot=None,sha256=hashlib.sha256(raw).hexdigest())
    if name==(job.get('outputs') or [None])[-1]:job['last_word_origin']='uploaded_word'
    store.save_job(job);store.audit(job_id,'version_word_updated',{'name':name,'backup':backup_id})


def delete_version(job_id,name,restore=False):
    job,item=selected(job_id,name,include_deleted=True)
    _file(job,name)
    metadata=job.setdefault('revisions',[])
    record=next((r for r in metadata if r['name']==name),None)
    if record is None:
        record={k:deepcopy(v) for k,v in item.items() if k not in {'job','available','archive_only','version'}};metadata.append(record)
    if restore:
        record.pop('deleted_at',None)
    else:record['deleted_at']=store.now()
    # Rebuild active membership while retaining original revision numbers and bytes.
    active=[r for r in version_info(job) if not r.get('deleted_at') and r['available']]
    active.sort(key=lambda r:(r['created'],r['number'],r['name']))
    job['outputs']=[r['name'] for r in active]
    if active:
        last=active[-1];job.update(last_exported=last['created'],last_exported_title=last['title'],last_word_origin=last['origin'])
    store.save_job(job);store.audit(job_id,'version_restored' if restore else 'version_trashed',{'name':name})
    return history(group_id(job))


def save_tag(name,color,identifier=None):
    name=re.sub(r'\s+',' ',str(name)).strip();color=str(color).lower()
    if not 1<=len(name)<=60 or any(ord(c)<32 for c in name):raise ValueError('Use a tag name between 1 and 60 characters.')
    if not re.fullmatch(r'#[0-9a-f]{6}',color):raise ValueError('Choose a valid tag color.')
    identifier=identifier or uuid.uuid4().hex
    with store.connection() as db:
        if identifier and not re.fullmatch(r'[0-9a-f]{32}',identifier):raise ValueError('This tag was not found.')
        duplicate=next((r for r in db.execute('SELECT id,name FROM tags') if r['id']!=identifier and r['name'].casefold()==name.casefold()),None)
        if duplicate:raise ValueError('A tag with this name already exists.')
        db.execute('INSERT INTO tags VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color',(identifier,name,color,store.now()))
    return tags()


def assign_tags(person,identifiers):
    members(person)
    if not isinstance(identifiers,list) or len(identifiers)>100:raise ValueError('Choose available tags.')
    identifiers=list(dict.fromkeys(identifiers));known={t['id'] for t in tags()}
    if any(i not in known for i in identifiers):raise ValueError('Choose available tags.')
    with store.connection() as db:
        db.execute('DELETE FROM group_tags WHERE group_id=?',(person,))
        db.executemany('INSERT INTO group_tags VALUES (?,?)',[(person,i) for i in identifiers])
    return history(person)


def delete_tag(identifier):
    with store.connection() as db:
        if not db.execute('SELECT 1 FROM tags WHERE id=?',(identifier,)).fetchone():raise ValueError('This tag was not found.')
        db.execute('DELETE FROM group_tags WHERE tag_id=?',(identifier,));db.execute('DELETE FROM tags WHERE id=?',(identifier,))
    return tags()



def generation_template(job,expected_sha=None):
    from . import template_manager
    from .templates import registry
    kind=job['fields']['contract_type']['value'];reference=job.get('template_reference',{})
    if not reference.get('sha256') or reference.get('kind')!=kind:return template_manager.active(kind,expected_sha)[0]
    current=registry().get(kind,{})
    candidate=next((entry for entry in [current]+current.get('history',[]) if entry.get('sha256')==reference['sha256']),None)
    if candidate is None:raise ValueError('The original template for this version is unavailable. Edit its Word file and upload the result instead.')
    if candidate is current:
        return template_manager.active(kind,reference['sha256'])[0]
    path=template_manager.file_path(kind,version=candidate['version'],expected_sha=reference['sha256'])
    return {**candidate,'path':str(path)}


def next_revision(job):
    return 1+max([r.get('number',0) for r in version_info(job)]+[0])
