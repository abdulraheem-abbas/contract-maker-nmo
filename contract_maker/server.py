from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse,parse_qs,quote
from zipfile import ZipFile,ZIP_DEFLATED
from io import BytesIO
from copy import deepcopy
import base64
import hashlib
import json
import mimetypes
import os
import re
import secrets
import threading
import uuid
import webbrowser
import time
from .config import DATA,RESOURCES,ALLOWED_EXTENSIONS,APP_NAME,initialize
from .fields import FIELDS,FIELD_KEYS,empty_fields,required_fields
from .checks import check_fields,calculations
from .spreadsheets import read_workbook,row_import,suggested_mapping,column_index
from . import store
from .readers import read_file,page_image
from .templates import registry,generate,template_requirements
from . import __version__
from .privacy import install_network_guard
from . import template_manager
from .documents import catalog,add_type,document_type

TASKS={}
TASK_LOCK=threading.Lock()
REQUEST_LOCK=threading.RLock()
SESSION=secrets.token_urlsafe(32)
CSRF=secrets.token_urlsafe(32)

def rules():
    path=DATA/'rules.json'
    return json.loads(path.read_text()) if path.exists() else {'job_title_overrides':[]}

def public_source(source):
    result={k:v for k,v in source.items() if k not in {'path'}}
    result['pages']=[{k:v for k,v in p.items() if k not in {'path','pdf'}} for p in source['pages']]
    return result

def full_job(job_id):
    job=store.get_job(job_id)
    job['source_details']=[public_source(store.get_source(s)) for s in job.get('sources',[])]
    job['calculations']=calculations(job['fields'])
    job['outputs']=[name for name in job.get('outputs',[]) if name.lower().endswith('.docx')]
    job['validation']=check_fields(job['fields'],registry().get(job['fields']['contract_type']['value'],{}),rules())
    return job

def sheet_source(job_id,source_id):
    job=store.get_job(job_id)
    if source_id not in job['sources']:raise ValueError('Choose a spreadsheet from this workspace.')
    source=store.get_source(source_id)
    if hashlib.sha256(Path(source['path']).read_bytes()).hexdigest()!=source['sha256']:
        raise ValueError('The spreadsheet copy changed. Import it again before using a row.')
    return job,source,read_workbook(source['path'])

def verify_sources(job):
    for source_id in job.get('sources',[]):
        source=store.get_source(source_id)
        if hashlib.sha256(Path(source['path']).read_bytes()).hexdigest()!=source['sha256']:
            raise ValueError('A local source copy changed after import. Re-import that document and confirm its fields again.')

def run_task(label,operation,job_id=None):
    task_id=uuid.uuid4().hex
    cancel=threading.Event()
    with TASK_LOCK:
        if job_id and any(t.get('job')==job_id and t['status']=='running' for t in TASKS.values()):raise ValueError('This workspace already has an operation running. Wait for it to finish.')
        TASKS[task_id]={'id':task_id,'job':job_id,'label':label,'status':'running','message':label,'cancel':cancel,'created':time.time()}
    def progress(message):
        TASKS[task_id]['message']=message
    def work():
        try:
            result=operation(progress,cancel.is_set)
            TASKS[task_id].update(status='cancelled' if cancel.is_set() else 'complete',result=result,message='Cancelled' if cancel.is_set() else 'Complete')
        except Exception as exc:
            TASKS[task_id].update(status='error',message=str(exc) if isinstance(exc,ValueError) else 'This operation could not finish. Your originals were preserved.')
            # Diagnostic logs deliberately exclude document bodies and prompts.
            with (DATA/'logs/app.log').open('a') as log:
                log.write(f'{store.now()} {type(exc).__name__} in {label}\n')
    threading.Thread(target=work,daemon=True).start()
    return {'task':task_id}

def save_input_fields(job,payload):
    modified=False
    for key,value in payload.get('fields',{}).items():
        if key not in FIELD_KEYS or not isinstance(value,dict):
            continue
        entered=str(value.get('value',''))[:1200]
        existing=job['fields'][key]
        if entered!=existing.get('value',''):
            modified=True
            existing.update(value=entered,origin='entered by you',confirmed=False)
            existing.pop('note',None)
        existing['confirmed']=bool(value.get('confirmed',False))
    job['title']=job['fields']['name_en']['value'] or job['fields']['name_ar']['value'] or job.get('title','New contract')
    if modified:
        job['findings']=[];job.pop('checked_at',None)
    store.save_job(job)
    return job

def store_word_revision(job,raw,source_name,origin):
    revision=1+sum(n.lower().endswith('.docx') for n in job.get('outputs',[]))
    stem=re.sub(r'[\\/:*?"<>|\x00-\x1f]','-',Path(source_name).stem).strip()[:110] or 'Contract'
    name=f'{stem} - v{revision}.docx'
    folder=DATA/'outputs'/job['id'];folder.mkdir(parents=True,exist_ok=True)
    (folder/name).write_bytes(raw)
    job['outputs'].append(name);job['last_exported']=store.now()
    job['last_exported_title']=job['title']
    job.setdefault('revisions',[]).append({'name':name,'number':revision,'created':job['last_exported'],'origin':origin,'sha256':hashlib.sha256(raw).hexdigest()})
    job['last_word_origin']=origin
    return name

class AppServer(ThreadingHTTPServer):
    daemon_threads=True
    allow_reuse_address=True

class Handler(BaseHTTPRequestHandler):
    server_version='NMOContractMaker'
    def log_message(self,*args):
        pass

    @property
    def origin(self):
        return f'http://127.0.0.1:{self.server.server_port}'

    def check_host(self):
        return self.headers.get('Host')==f'127.0.0.1:{self.server.server_port}'

    def send_common_headers(self,content_type='application/json; charset=utf-8',status=200,length=None):
        self.send_response(status)
        self.send_header('Content-Type',content_type)
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Cross-Origin-Resource-Policy','same-origin')
        self.send_header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
        if length is not None:self.send_header('Content-Length',str(length))

    def respond(self,value,status=200):
        data=json.dumps(value,ensure_ascii=False).encode()
        self.send_common_headers(status=status,length=len(data));self.end_headers();self.wfile.write(data)

    def binary(self,data,content_type,name=None):
        self.send_common_headers(content_type,length=len(data))
        if name:self.send_header('Content-Disposition',"attachment; filename*=UTF-8''"+quote(name))
        self.end_headers();self.wfile.write(data)

    def authenticated(self):
        cookie=self.headers.get('Cookie','')
        return any(c.strip()==f'nmo_contract_maker={SESSION}' for c in cookie.split(';'))

    def do_GET(self):
        if not self.check_host():
            return self.respond({'error':'Only the local app address is accepted.'},403)
        parts=urlparse(self.path);route=parts.path;q=parse_qs(parts.query)
        arg=lambda key,default='':q.get(key,[default])[0]
        try:
            if route=='/':
                content=(RESOURCES/'web/index.html').read_bytes()
                self.send_common_headers('text/html; charset=utf-8',length=len(content))
                self.send_header('Set-Cookie',f'nmo_contract_maker={SESSION}; HttpOnly; SameSite=Strict; Path=/')
                self.end_headers();self.wfile.write(content);return
            if route in {'/app.js','/app.css','/icon.svg','/report.css'}:
                p=RESOURCES/'web'/route[1:]
                return self.binary(p.read_bytes(),mimetypes.guess_type(str(p))[0] or 'application/octet-stream')
            if route=='/favicon.ico':
                return self.binary((RESOURCES/'web/icon.svg').read_bytes(),'image/svg+xml')
            if route=='/api/ping':return self.respond({'application':APP_NAME,'data_id':hashlib.sha256(str(DATA).encode()).hexdigest()})
            if not self.authenticated():
                return self.respond({'error':'Open NMO Contract Maker in its own window first.'},403)
            if route=='/api/bootstrap':
                return self.respond({'csrf':CSRF,'jobs':store.jobs(),'completed':store.completed(),'identity_types':catalog(),'fields':FIELDS,'templates':{k:{**{a:b for a,b in v.items() if a in {'label','sha256','placeholders','ready','version','source_name','saved_at'}},'history_count':len(v.get('history',[])),'required_fields':sorted(template_requirements(v)|required_fields(k))} for k,v in registry().items()},'generation_only':True,'requires_models':False,'word_only':True,'rules':rules(),'version':__version__})
            if route=='/api/job':return self.respond(full_job(arg('id')))
            if route=='/api/completed':return self.respond(store.completed())
            if route=='/api/sheet':
                job,source,sheets=sheet_source(arg('job'),arg('source'))
                index=int(arg('sheet','0'))
                if not 0<=index<len(sheets):raise ValueError('Choose an existing worksheet.')
                sheet=sheets[index]
                header_number=int(arg('header',str(sheet['rows'][0]['number'] if sheet['rows'] else 1)))
                header=next((r for r in sheet['rows'] if r['number']==header_number),{'cells':{}})
                columns=sorted({c for row in sheet['rows'] for c in row['cells']},key=column_index)
                return self.respond({'sheets':[s['name'] for s in sheets],'sheet':index,'rows':sheet['rows'],'columns':columns,'header':header_number,'suggested_mapping':suggested_mapping(header)})
            if route=='/api/source-file':
                job=store.get_job(arg('job'))
                if arg('source') not in job['sources']:raise ValueError('Source not found in this workspace.')
                source=store.get_source(arg('source'));path=Path(source['path'])
                return self.binary(path.read_bytes(),mimetypes.guess_type(source['name'])[0] or 'application/octet-stream',source['name'] if arg('download')=='1' else None)
            if route=='/api/task':
                task=TASKS.get(arg('id'))
                if not task:return self.respond({'error':'Task not found.'},404)
                return self.respond({k:v for k,v in task.items() if k!='cancel'})
            if route=='/api/page':
                source=store.get_source(arg('source'))
                index=int(arg('page','1'))-1
                if not 0<=index<len(source['pages']):raise ValueError('Page not found.')
                picture=page_image(source,index,max_side=1800)
                if picture:return self.binary(picture,'image/jpeg')
                return self.respond({'text':source['pages'][index]['text']})
            if route=='/api/file':
                job=store.get_job(arg('job'));name=arg('name')
                if name not in job.get('outputs',[]) or not name.lower().endswith('.docx'):raise ValueError('Word output not found.')
                p=DATA/'outputs'/job['id']/name
                return self.binary(p.read_bytes(),mimetypes.guess_type(name)[0] or 'application/octet-stream',name if arg('download')=='1' else None)
            if route=='/api/bundle':
                job=store.get_job(arg('job'));buffer=BytesIO()
                with ZipFile(buffer,'w',ZIP_DEFLATED) as z:
                    for name in job.get('outputs',[]):
                        if name.lower().endswith('.docx'):z.write(DATA/'outputs'/job['id']/name,name)
                return self.binary(buffer.getvalue(),'application/zip','Contract package.zip')
            if route=='/api/template-editor':
                return self.respond(template_manager.describe(arg('kind'),arg('draft') or None))
            if route=='/api/template-file':
                kind=arg('kind');pdf=arg('format')=='pdf'
                p=template_manager.file_path(kind,arg('draft') or None,arg('version') or None,pdf,arg('sha') or None)
                return self.binary(p.read_bytes(),'application/pdf' if pdf else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',None if pdf else kind+' template.docx')
            if route=='/api/template-page':
                p=template_manager.file_path(arg('kind'),arg('draft') or None,pdf=True,expected_sha=arg('sha') or None)
                index=int(arg('page','1'))
                if not 1<=index<=120:raise ValueError('Template page not found.')
                picture=p.with_name(f'page-{index:04d}.jpg')
                if not picture.is_file():raise ValueError('Create the template preview first.')
                return self.binary(picture.read_bytes(),'image/jpeg')
            return self.respond({'error':'Not found.'},404)
        except (ValueError,KeyError,IndexError,OSError) as exc:
            return self.respond({'error':str(exc)},400)

    def do_POST(self):
        # Serialize short mutations; long imports, previews and exports run as tasks.
        with REQUEST_LOCK:
            return self.handle_post()

    def handle_post(self):
        if not self.check_host() or not self.authenticated() or self.headers.get('Origin')!=self.origin or not secrets.compare_digest(self.headers.get('X-Private-CSRF',''),CSRF):
            return self.respond({'error':'A request from outside this local app was refused.'},403)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>48*1024*1024:raise ValueError('Choose files up to 25 MB each.')
            payload=json.loads(self.rfile.read(length))
            if not isinstance(payload,dict):raise ValueError('Invalid request.')
            route=urlparse(self.path).path
            if payload.get('job') and route in {'/api/save','/api/import','/api/sheet-import','/api/check','/api/generate','/api/archive-word'}:
                with TASK_LOCK:
                    if any(t.get('job')==payload['job'] and t['status']=='running' for t in TASKS.values()):
                        raise ValueError('Wait for this workspace operation to finish before changing its details.')
            if route=='/api/new':
                if payload.get('mode','create')!='create':raise ValueError('This app creates contracts only.')
                fields=empty_fields();kind=payload.get('kind','employment')
                if kind not in {'employment','service','extension'}:raise ValueError('Choose a supported contract type.')
                fields['contract_type']={'value':kind,'confirmed':True,'origin':'chosen by you','evidence':[]}
                job={'id':uuid.uuid4().hex,'title':'New '+kind+' contract','mode':'create','fields':fields,'sources':[],'findings':[],'outputs':[],'created':store.now()}
                store.save_job(job);store.audit(job['id'],'workspace_created',{'mode':job['mode'],'kind':kind})
                return self.respond(job)
            if route=='/api/save':
                job=save_input_fields(store.get_job(payload['job']),payload)
                return self.respond(full_job(job['id']))
            if route=='/api/identity-type':
                entry=add_type(payload.get('ar',''),payload.get('en',''),payload.get('verb_ar','صادرة'),payload.get('article_en','a'))
                return self.respond({'identity_type':entry,'identity_types':catalog()})
            if route=='/api/archive-word':
                name=Path(str(payload.get('name','')).replace('\\','/')).name
                if Path(name).suffix.lower()!='.docx':raise ValueError('Choose a Word .docx contract.')
                raw=base64.b64decode(payload['data'],validate=True)
                if not raw or len(raw)>25*1024*1024:raise ValueError('Choose a Word file up to 25 MB.')
                from .readers import checked_zip
                from .templates import parse
                try:
                    with checked_zip(BytesIO(raw)) as package:parse(package.read('word/document.xml'))
                except Exception as exc:raise ValueError('This file could not be read as a Word contract.') from exc
                if payload.get('job'):
                    job=store.get_job(payload['job'])
                else:
                    kind=payload.get('kind','employment')
                    if kind not in {'employment','service','extension'}:raise ValueError('Choose a contract type.')
                    values=empty_fields();values['contract_type'].update(value=kind,confirmed=True,origin='chosen by you')
                    title=str(payload.get('title') or Path(name).stem).strip()[:200]
                    job={'id':uuid.uuid4().hex,'title':title,'mode':'create','archive_only':True,'fields':values,'sources':[],'findings':[],'outputs':[],'created':store.now()}
                filename=store_word_revision(job,raw,name,'uploaded_word')
                store.save_job(job);store.audit(job['id'],'word_revision_uploaded',{'file':filename,'sha256':hashlib.sha256(raw).hexdigest()})
                return self.respond({'job':full_job(job['id'])})
            if route=='/api/import':
                job_id=payload['job'];store.get_job(job_id)
                name=Path(str(payload['name']).replace('\\','/')).name
                suffix=Path(name).suffix.lower()
                if suffix not in ALLOWED_EXTENSIONS:raise ValueError('Choose a PDF, Word document, image, ODS, XLSX, CSV or text file.')
                role=payload.get('role','offer')
                if role not in {'offer','identity','list'}:raise ValueError('Choose the document role.')
                raw=base64.b64decode(payload['data'],validate=True)
                if len(raw)>25*1024*1024:raise ValueError('Choose files up to 25 MB each.')
                path=DATA/'sources'/(uuid.uuid4().hex+suffix)
                path.write_bytes(raw)
                def import_work(progress,cancelled):
                    progress('Reading your selected file locally')
                    pages=read_file(path)
                    source=store.add_source(name,role,path,pages)
                    job=store.get_job(job_id);job['sources'].append(source['id']);store.save_job(job)
                    store.audit(job_id,'source_added',{'source':source['id'],'sha256':source['sha256'],'role':role})
                    return {'job':job_id,'source':source['id']}
                return self.respond(run_task('Importing document',import_work,job_id))
            if route=='/api/sheet-import':
                job,source,sheets=sheet_source(payload['job'],payload['source'])
                index=int(payload.get('sheet',0))
                if not 0<=index<len(sheets):raise ValueError('Choose an existing worksheet.')
                proposal=row_import(sheets[index],int(payload['row']),payload.get('mappings'),job['fields']['contract_type']['value'])
                replace=payload.get('replace_filled') is True
                for key in ['name_ar','name_en']:
                    old=job['fields'][key]['value'].strip();new=proposal['fields'].get(key,{}).get('value','')
                    if old and new and old!=new and not replace:
                        raise ValueError('This row names a different employee. Choose the matching row, or check Replace filled fields after verifying it.')
                imported=[];skipped=[]
                notes={w['field']:w['message'] for w in proposal['warnings']}
                for key,item in proposal['fields'].items():
                    existing=job['fields'][key]
                    if existing['value'].strip() and not replace:
                        skipped.append(key);continue
                    job['fields'][key]={'value':item['value'],'confirmed':False,'origin':'spreadsheet row '+str(item['row'])+', column '+item['column'],'evidence':[{'source_id':source['id'],'source_name':source['name'],'page':index+1,'quote':sheets[index]['name']+' · Row '+str(item['row'])+', '+item['column']+': '+item['value']}],**({'note':notes[key]} if key in notes else {})}
                    imported.append(key)
                job['title']=job['fields']['name_en']['value'] or job['fields']['name_ar']['value'] or job['title']
                job['findings']=[];job.pop('checked_at',None)
                job.setdefault('spreadsheet_imports',[]).append({'source':source['id'],'sha256':source['sha256'],'sheet':sheets[index]['name'],'row':int(payload['row']),'mappings':payload['mappings'],'imported':imported,'skipped':skipped,'warnings':proposal['warnings'],'created':store.now()})
                store.save_job(job);store.audit(job['id'],'spreadsheet_row_imported',{'source':source['id'],'sheet':index,'row':int(payload['row']),'fields':imported})
                return self.respond({'job':full_job(job['id']),'imported':imported,'skipped':skipped,'warnings':proposal['warnings']})
            if route=='/api/cancel':
                task=TASKS.get(payload['task'])
                if task:task['cancel'].set()
                return self.respond({'ok':True})
            if route=='/api/check':
                job=save_input_fields(store.get_job(payload['job']),payload)
                job['findings']=check_fields(job['fields'],registry().get(job['fields']['contract_type']['value'],{}),rules())
                job['checked_at']=store.now()
                store.save_job(job)
                return self.respond({'findings':job['findings'],'calculations':calculations(job['fields']),'checked_at':job['checked_at']})
            if route=='/api/generate':
                job=save_input_fields(store.get_job(payload['job']),payload);job_id=job['id']
                template_entry,_=template_manager.active(job['fields']['contract_type']['value'],payload.get('template_sha'))
                problems=check_fields(job['fields'],template_entry,rules(),confirmed=True)
                errors=[p for p in problems if p['level']=='error']
                if errors:return self.respond({'error':'Complete and confirm the required fields first.','findings':errors},400)
                warnings=[p for p in problems if p['level']=='warning']
                if warnings and payload.get('acknowledge_warnings') is not True:
                    return self.respond({'error':'Acknowledge the flagged dates or expiry before creating this contract.','findings':warnings},400)
                confirmed_snapshot=deepcopy(job['fields'])
                def generate_work(progress,cancelled):
                    job=store.get_job(job_id)
                    job['fields']=confirmed_snapshot
                    verify_sources(job)
                    kind=job['fields']['contract_type']['value'];entry=template_entry
                    template=entry.get('path')
                    if not template or not Path(template).exists():raise ValueError('Prepare this template in Templates before generating a contract.')
                    if hashlib.sha256(Path(template).read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('The template has changed outside the app. Re-import it before generation.')
                    # Protect previous output revisions instead of overwriting them.
                    revision=1+sum(name.lower().endswith('.docx') for name in job['outputs'])
                    name=job['fields']['name_ar']['value'] or job['fields']['name_en']['value']
                    name=re.sub(r'[\\/:*?"<>|\x00-\x1f]','-',name).strip()[:120]
                    prefix={'employment':'عقد عمل','service':'عقد خدمة','extension':'خطاب تمديد'}[kind]
                    stem=f'{prefix} - {name} - v{revision}'
                    out=DATA/'outputs'/job_id;out.mkdir(exist_ok=True)
                    docx=out/(stem+'.docx')
                    progress('Filling the approved Word template')
                    verification=generate(template,job['fields'],docx)
                    verification['template']={k:v for k,v in entry.items() if k in {'label','sha256','version','source_name','saved_at'}}
                    verification['sources']=[{'name':s['name'],'role':s['role'],'sha256':s['sha256']} for s in [store.get_source(i) for i in job['sources']]]
                    verification['confirmed_fields']=job['fields']
                    verification['identity_type']=document_type(job['fields']['identity_type']['value']) if job['fields']['identity_type']['value'] else None
                    verification['spreadsheet_imports']=job.get('spreadsheet_imports',[])
                    verification['visual_review_required']=True
                    records=DATA/'records'/job_id;records.mkdir(parents=True,exist_ok=True)
                    (records/f'revision-{revision}.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2))
                    job['outputs'].append(docx.name);job['findings']=warnings;job['archive_only']=False
                    job['last_exported']=store.now();job['last_exported_title']=job['title'];job['last_word_origin']='generated'
                    job.setdefault('revisions',[]).append({'name':docx.name,'number':revision,'created':job['last_exported'],'origin':'generated','sha256':verification['sha256']})
                    job['last_generation']=verification;store.save_job(job)
                    store.audit(job_id,'contract_generated',{'revision':revision,'outputs':[docx.name],'verification':{k:v for k,v in verification.items() if k not in {'confirmed_fields','sources','spreadsheet_imports'}}})
                    return {'job':job_id}
                return self.respond(run_task('Creating contract',generate_work,job_id))
            if route=='/api/shutdown':
                if any(t['status']=='running' for t in TASKS.values()):raise ValueError('Wait for the current operation to finish before quitting.')
                self.respond({'ok':True})
                threading.Thread(target=self.server.shutdown,daemon=True).start()
                return
            if route=='/api/template-save':
                return self.respond(template_manager.map_fields(payload['kind'],payload.get('draft'),payload['expected_sha'],payload.get('mappings')))
            if route=='/api/template-import':
                raw=base64.b64decode(payload['data'],validate=True)
                return self.respond(template_manager.stage(payload['kind'],str(payload['name']),raw,payload['expected_sha']))
            if route=='/api/template-activate':
                return self.respond(template_manager.activate(payload['kind'],payload['draft'],payload['expected_sha'],payload.get('reviewed')))
            if route=='/api/template-restore':
                return self.respond(template_manager.restore_draft(payload['kind'],payload['version'],payload['expected_sha']))
            if route=='/api/template-preview':
                kind=payload['kind'];draft=payload.get('draft')
                # Capture the path before dispatch; drafts and saved versions are immutable.
                source=template_manager.file_path(kind,draft,expected_sha=payload.get('expected_sha'))
                return self.respond(run_task('Creating template preview',lambda progress,cancelled:template_manager.preview(kind,draft,progress,cancelled,source)))
            return self.respond({'error':'Not found.'},404)
        except (ValueError,KeyError,IndexError,OSError) as exc:
            return self.respond({'error':str(exc)},400)
        except Exception:
            return self.respond({'error':'This action could not finish. Your originals were preserved.'},500)

def serve(port=0,open_browser=True):
    initialize()
    install_network_guard()
    server=AppServer(('127.0.0.1',port),Handler)
    url=f'http://127.0.0.1:{server.server_port}'
    (DATA/'app-address.json').write_text(json.dumps({'url':url,'pid':os.getpid()}))
    if open_browser:threading.Timer(.5,lambda:webbrowser.open(url)).start()
    if __import__('sys').stdout is not None:print(url,flush=True)
    try:server.serve_forever()
    finally:
        server.server_close()
        try:(DATA/'app-address.json').unlink()
        except OSError:pass
