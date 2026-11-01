import base64
from copy import deepcopy
from urllib.error import HTTPError
import pytest
from contract_maker import store,archive
from tests.test_api import app
from tests.helpers import fields
from tests.test_templates import word


def export(app,job,values=None):
    app['wait'](app['post']('/api/generate',{'job':job['id'],'fields':values or fields()})['task'])
    return app['get']('/api/job?id='+job['id'])


def old_and_new(app):
    job=app['post']('/api/new',{})
    old=fields();old['start_date']['value']='2026-10-11'
    first=export(app,job,old);name=first['outputs'][0];raw=(app['data']/'outputs'/job['id']/name).read_bytes()
    updated=fields();updated['salary_usd']['value']='900.25'
    latest=export(app,job,updated)
    return latest,name,raw


def test_legacy_history_recovers_each_saved_snapshot_and_creation_time(app):
    job,name,raw=old_and_new(app)
    record=store.get_job(job['id']);record['revisions'][0].pop('fields_snapshot');record['revisions'][0]['created']='2022-01-01T12:30:00+00:00';store.save_job(record)
    history=app['get']('/api/history?group='+job['id'])
    assert len(history['versions'])==2
    old=history['versions'][-1];assert old['created']=='2022-01-01T12:30:00+00:00' and old['can_edit_fields']
    assert 'fields_snapshot' not in old
    draft=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'copy'})['job']
    assert draft['fields']['start_date']['value']=='2026-10-11'
    assert draft['fields']['salary_usd']['value']=='825.69'
    assert not draft['outputs'] and draft['person_id']==job['id']
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw


def test_duplicate_selected_old_version_has_one_word_and_independent_history(app):
    job,name,raw=old_and_new(app)
    copied=app['post']('/api/version-duplicate',{'job':job['id'],'name':name,'mode':'separate'})['job']
    assert copied['person_id']==copied['id'] and len(copied['outputs'])==1
    assert copied['fields']['start_date']['value']=='2026-10-11'
    assert copied['fields']['manager_title_en']['value']=='Education Officer'
    assert all(not f['confirmed'] for f in copied['fields'].values())
    assert (app['data']/'outputs'/copied['id']/copied['outputs'][0]).read_bytes()==raw
    assert len(app['get']('/api/history?group='+job['id'])['versions'])==2
    assert len(app['get']('/api/history?group='+copied['id'])['versions'])==1
    assert len(app['get']('/api/completed'))==2


def test_same_person_duplicate_is_grouped_and_recent_duplicate_can_be_updated(app):
    job,name,raw=old_and_new(app)
    copied=app['post']('/api/version-duplicate',{'job':job['id'],'name':name,'mode':'same_person'})['job']
    assert len(app['get']('/api/completed'))==1
    history=app['get']('/api/history?group='+job['id']);assert len(history['versions'])==3
    recent=history['versions'][0];assert recent['duplicated_at'] and recent['job']==copied['id']
    edited=app['post']('/api/version-edit',{'job':copied['id'],'name':copied['outputs'][0],'mode':'replace'})['job']
    changed=fields();changed['salary_usd']['value']='990.25'
    export(app,edited,changed)
    after=app['get']('/api/history?group='+job['id'])
    assert len(after['versions'])==3
    assert after['versions'][0]['created']==recent['created']
    assert after['versions'][0]['updated'] and after['versions'][0]['duplicated_at']==recent['duplicated_at']
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw
    assert len(list((app['data']/'records'/copied['id']/'edit-backups').glob('*.docx')))==1


def test_edit_old_version_copy_preserves_original_and_replace_updates_only_selected(app):
    job,name,raw=old_and_new(app)
    copy=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'copy'})['job']
    export(app,copy)
    assert len(app['get']('/api/history?group='+job['id'])['versions'])==3
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw
    draft=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'replace'})['job']
    values=fields();values['salary_usd']['value']='901.25'
    export(app,draft,values)
    assert len(app['get']('/api/history?group='+job['id'])['versions'])==3
    assert (app['data']/'outputs'/job['id']/name).read_bytes()!=raw
    refreshed=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'copy'})['job']
    assert refreshed['fields']['salary_usd']['value']=='901.25'
    assert store.get_job(job['id'])['fields']['salary_usd']['value']=='900.25'


def test_delete_restore_and_next_revision_do_not_overwrite_old_files(app):
    job,name,raw=old_and_new(app);last=job['outputs'][-1]
    deleted=app['post']('/api/version-delete',{'job':job['id'],'name':last})
    assert len([v for v in deleted['versions'] if not v.get('deleted_at')])==1
    assert app['get']('/api/completed')[0]['latest_word']==name
    with pytest.raises(HTTPError):app['get']('/api/file?job='+job['id']+'&name='+__import__('urllib.parse').parse.quote(last))
    next_job=export(app,job);assert next_job['revisions'][-1]['number']==3
    restored=app['post']('/api/version-restore',{'job':job['id'],'name':last})
    assert len([v for v in restored['versions'] if not v.get('deleted_at')])==3
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw


def test_named_tags_persist_recolor_assign_copy_and_delete_without_changing_words(app):
    job,name,raw=old_and_new(app)
    tags=app['post']('/api/tag-save',{'name':'Ready for signature','color':'#176f78'})['tags'];tag=tags[0]
    app['post']('/api/group-tags',{'group':job['id'],'tags':[tag['id']]})
    assert app['get']('/api/completed')[0]['tag_ids']==[tag['id']]
    result=app['post']('/api/tag-save',{'id':tag['id'],'name':'Approved','color':'#ff8800'})['tags'];assert result[0]['color']=='#ff8800'
    copied=app['post']('/api/version-duplicate',{'job':job['id'],'name':name,'mode':'separate'})['job']
    assert app['get']('/api/history?group='+copied['id'])['tag_ids']==[tag['id']]
    with pytest.raises(HTTPError):app['post']('/api/tag-save',{'name':'approved','color':'#ffffff'})
    with pytest.raises(HTTPError):app['post']('/api/tag-save',{'name':'Invalid color','color':'url(outside)'})
    app['post']('/api/tag-delete',{'id':tag['id']})
    assert not app['get']('/api/completed')[0]['tag_ids']
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw


def test_uploaded_word_has_history_and_copy_without_inventing_form_values(app):
    raw=word(['Existing external contract'])
    job=app['post']('/api/archive-word',{'name':'External.docx','kind':'service','data':base64.b64encode(raw).decode()})['job']
    name=job['outputs'][0];version=app['get']('/api/history?group='+job['id'])['versions'][0]
    assert not version['can_edit_fields']
    copied=app['post']('/api/version-duplicate',{'job':job['id'],'name':name,'mode':'same_person'})['job']
    assert copied['archive_only'] and not copied['fields']['identity_number']['value']
    with pytest.raises(HTTPError):app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'replace'})


def test_all_deleted_versions_remain_accessible_in_global_trash(app):
    job,name,raw=old_and_new(app)
    for filename in job['outputs']:app['post']('/api/version-delete',{'job':job['id'],'name':filename})
    boot=app['get']('/api/bootstrap');assert not boot['completed']
    assert boot['trashed'][0]['group_id']==job['id'] and boot['trashed'][0]['count']==2
    app['post']('/api/version-restore',{'job':job['id'],'name':name})
    assert app['get']('/api/completed')[0]['word_count']==1
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw


def test_uploaded_version_can_be_updated_without_new_revision_or_inferred_fields(app):
    first=word(['External original'])
    job=app['post']('/api/archive-word',{'name':'External.docx','data':base64.b64encode(first).decode()})['job'];name=job['outputs'][0]
    metadata=app['get']('/api/history?group='+job['id'])['versions'][0]
    raw=word(['External edit'])
    app['post']('/api/archive-word',{'job':job['id'],'name':'Edited.docx','replace_name':name,'expected_sha':metadata['sha256'],'data':base64.b64encode(raw).decode()})
    after=app['get']('/api/history?group='+job['id'])['versions'];assert len(after)==1
    assert after[0]['created']==metadata['created'] and after[0]['updated']
    assert not after[0]['can_edit_fields']
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw
    assert not store.get_job(job['id'])['fields']['identity_number']['value']


def test_pinned_original_template_is_used_after_current_template_changes(app):
    job,name,raw=old_and_new(app)
    initial=app['get']('/api/bootstrap')['templates']['employment']['sha256']
    tokens=app['get']('/api/bootstrap')['templates']['employment']['placeholders']
    replacement=word(['New wording']+[token+': {{'+token+'}}' for token in tokens])
    draft=app['post']('/api/template-import',{'kind':'employment','name':'New template.docx','data':base64.b64encode(replacement).decode(),'expected_sha':initial})
    app['post']('/api/template-activate',{'kind':'employment','draft':draft['draft'],'expected_sha':draft['sha256'],'reviewed':True})
    copied=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'copy'})['job']
    generated=export(app,copied)
    assert generated['last_generation']['template']['sha256']==initial
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==raw


def test_conflicting_edits_do_not_overwrite_a_newer_saved_version(app):
    job,name,raw=old_and_new(app)
    first=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'replace'})['job']
    second=app['post']('/api/version-edit',{'job':job['id'],'name':name,'mode':'replace'})['job']
    values=fields();values['salary_usd']['value']='975.25';export(app,first,values)
    saved=(app['data']/'outputs'/job['id']/name).read_bytes()
    task=app['post']('/api/generate',{'job':second['id'],'fields':fields()})['task']
    import time
    for _ in range(100):
        state=app['get']('/api/task?id='+task)
        if state['status']!='running':break
        time.sleep(.02)
    assert state['status']=='error' and 'changed while' in state['message']
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==saved
