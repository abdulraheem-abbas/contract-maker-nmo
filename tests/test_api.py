from http.cookiejar import CookieJar
from io import BytesIO
import base64
import json
from pathlib import Path
import threading
import time
from urllib.error import HTTPError
from urllib.request import build_opener, ProxyHandler, HTTPCookieProcessor, Request
import pytest
from contract_maker import config,server,store,templates,template_manager,readers,office
from tests.helpers import fields
from tests.test_templates import word


@pytest.fixture
def app(tmp_path,monkeypatch):
    for module in [config,server,store,templates,template_manager,readers,office]:monkeypatch.setattr(module,'DATA',tmp_path)
    config.initialize();server.TASKS.clear()
    raw=word();path=tmp_path/'templates/employment/template.docx';path.parent.mkdir()
    path.write_bytes(raw)
    (tmp_path/'templates/registry.json').write_text(json.dumps({'employment':{'path':str(path),'label':'Test employment','sha256':template_manager.digest(raw),'placeholders':template_manager.inspect(raw)['placeholders']}}))
    def no_office(*args):raise ValueError('Office unavailable for this unit check')
    monkeypatch.setattr(office,'to_pdf',no_office)
    http=server.AppServer(('127.0.0.1',0),server.Handler)
    thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{http.server_port}'
    client=build_opener(ProxyHandler({}),HTTPCookieProcessor(CookieJar()));client.open(base).read()
    def get(route):return json.load(client.open(base+route))
    def post(route,payload,origin=None):
        return json.load(client.open(Request(base+route,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Origin':origin or base,'X-Private-CSRF':server.CSRF})))
    def wait(task):
        for _ in range(100):
            result=get('/api/task?id='+task)
            if result['status']=='error':raise AssertionError(result['message'])
            if result['status'] in {'complete','cancelled'}:return result['result']
            time.sleep(.02)
        raise AssertionError('Task timed out')
    try:yield {'base':base,'get':get,'post':post,'wait':wait,'data':tmp_path}
    finally:
        http.shutdown();http.server_close();thread.join(timeout=2)


def test_bootstrap_and_source_access_use_separate_cookie_and_no_ai_routes(app):
    boot=app['get']('/api/bootstrap')
    assert boot['generation_only'] and not boot['requires_models'] and 'engine' not in boot
    old=build_opener(ProxyHandler({}))
    with pytest.raises(HTTPError) as error:old.open(Request(app['base']+'/api/bootstrap',headers={'Cookie':'private_contracts='+server.SESSION}))
    assert error.value.code==403
    with pytest.raises(HTTPError) as error:app['post']('/api/new',{},'https://outside.invalid')
    assert error.value.code==403
    for route in ['/api/extract','/api/review','/api/start-engine']:
        with pytest.raises(HTTPError) as error:app['post'](route,{})
        assert error.value.code==404
    with pytest.raises(HTTPError):app['post']('/api/new',{'mode':'review'})


def import_sheet(app,job):
    csv=b'name_en,identity_number,workplace_en,salary_usd\nTest Employee,00001234,Aden,825.69\nOther Employee,00009876,Taiz,900.25\n'
    result=app['post']('/api/import',{'job':job['id'],'role':'list','name':'Test employees.csv','data':base64.b64encode(csv).decode()})
    return app['wait'](result['task'])['source']


def test_spreadsheet_import_never_auto_confirms_and_preserves_existing_fields(app):
    job=app['post']('/api/new',{})
    source=import_sheet(app,job)
    app['post']('/api/save',{'job':job['id'],'fields':{'salary_usd':{'value':'900','confirmed':True}}})
    result=app['post']('/api/sheet-import',{'job':job['id'],'source':source,'sheet':0,'row':2,'mappings':{'A':'name_en','B':'identity_number','C':'workplace_en','D':'salary_usd'}})
    values=result['job']['fields']
    assert values['identity_number']['value']=='00001234' and not values['identity_number']['confirmed']
    assert values['salary_usd']['value']=='900' and values['salary_usd']['confirmed']
    assert result['skipped']==['salary_usd']
    assert values['workplace_en']['evidence'][0]['source_id']==source
    with pytest.raises(HTTPError):app['post']('/api/sheet-import',{'job':job['id'],'source':source,'sheet':0,'row':3,'mappings':{'A':'name_en'}})
    replaced=app['post']('/api/sheet-import',{'job':job['id'],'source':source,'sheet':0,'row':3,'mappings':{'A':'name_en'},'replace_filled':True})
    assert replaced['job']['fields']['name_en']['value']=='Other Employee'


def test_reference_image_is_viewed_without_extracting_or_filling_details(app):
    from PIL import Image
    image=BytesIO();Image.new('RGB',(160,100),'white').save(image,format='PNG')
    job=app['post']('/api/new',{})
    result=app['post']('/api/import',{'job':job['id'],'role':'identity','name':'Test identity image.png','data':base64.b64encode(image.getvalue()).decode()})
    app['wait'](result['task'])
    saved=app['get']('/api/job?id='+job['id'])
    assert saved['source_details'][0]['pages'][0]['image']
    assert saved['source_details'][0]['pages'][0]['text']==''
    assert all(not item['value'] for key,item in saved['fields'].items() if key!='contract_type')


def test_spreadsheet_membership_and_changed_source_are_checked(app):
    first=app['post']('/api/new',{});second=app['post']('/api/new',{})
    source=import_sheet(app,first)
    with pytest.raises(HTTPError):app['get']('/api/sheet?job='+second['id']+'&source='+source)
    source_path=Path(store.get_source(source)['path']);source_path.write_bytes(b'changed source')
    with pytest.raises(HTTPError):app['get']('/api/sheet?job='+first['id']+'&source='+source)


def test_generation_requires_confirmation_and_expiry_acknowledgement(app):
    job=app['post']('/api/new',{})
    values=fields();values['identity_number']['confirmed']=False
    with pytest.raises(HTTPError):app['post']('/api/generate',{'job':job['id'],'fields':values})
    values['identity_number']['confirmed']=True;values['identity_expiry_date']['value']='2024-06-01'
    with pytest.raises(HTTPError):app['post']('/api/generate',{'job':job['id'],'fields':values})
    result=app['wait'](app['post']('/api/generate',{'job':job['id'],'fields':values,'acknowledge_warnings':True})['task'])
    assert result=={'job':job['id']}
    saved=app['get']('/api/job?id='+job['id'])
    assert len(saved['outputs'])==1 and saved['outputs'][0].endswith('.docx')
    assert [path.suffix for path in (app['data']/'outputs'/job['id']).iterdir()]==['.docx']
    assert (app['data']/'records'/job['id']/'revision-1.json').is_file()
    assert saved['last_generation']['template']['sha256']
    assert saved['last_generation']['confirmed_fields']['identity_number']['value']=='00001234'


def test_busy_workspace_rejects_mutations_without_losing_saved_data(app):
    job=app['post']('/api/new',{});release=threading.Event()
    def hold(progress,cancelled):release.wait(3);return {'job':job['id']}
    task=server.run_task('Held unit operation',hold,job['id'])
    try:
        with pytest.raises(HTTPError):app['post']('/api/save',{'job':job['id'],'fields':{'name_en':{'value':'Unexpected overwrite','confirmed':True}}})
        assert store.get_job(job['id'])['fields']['name_en']['value']==''
    finally:release.set()
    app['wait'](task['task'])


def test_completed_contract_reopens_and_keeps_earlier_word_revisions(app):
    job=app['post']('/api/new',{})
    assert not app['get']('/api/completed')
    app['wait'](app['post']('/api/generate',{'job':job['id'],'fields':fields()})['task'])
    first=app['get']('/api/job?id='+job['id']);name=first['outputs'][0]
    original=(app['data']/'outputs'/job['id']/name).read_bytes()
    changed=fields();changed['salary_usd']['value']='900.25'
    app['post']('/api/save',{'job':job['id'],'fields':changed})
    assert app['get']('/api/completed')[0]['has_changes']
    app['wait'](app['post']('/api/generate',{'job':job['id'],'fields':changed})['task'])
    saved=app['get']('/api/job?id='+job['id']);completed=app['get']('/api/completed')
    assert len(saved['outputs'])==2 and completed[0]['word_count']==2
    assert not completed[0]['has_changes']
    assert (app['data']/'outputs'/job['id']/name).read_bytes()==original
    assert saved['fields']['salary_usd']['value']=='900.25'


def test_archive_accepts_existing_word_and_keeps_uploaded_changes_exactly(app):
    raw=word(['Existing Word contract · preserve this wording.'])
    result=app['post']('/api/archive-word',{'name':'Existing.docx','title':'Test archived contract','kind':'service','data':base64.b64encode(raw).decode()})
    job=result['job'];assert job['archive_only'] and len(job['outputs'])==1
    updated=word(['Edited outside the app.'])
    result=app['post']('/api/archive-word',{'job':job['id'],'name':'Edited.docx','data':base64.b64encode(updated).decode()})
    assert len(result['job']['outputs'])==2
    folder=app['data']/'outputs'/job['id']
    assert (folder/job['outputs'][0]).read_bytes()==raw
    assert (folder/result['job']['outputs'][1]).read_bytes()==updated
    assert not result['job']['fields']['name_ar']['value']


def test_legacy_pdf_and_evidence_files_are_hidden_from_exports(app):
    from urllib.parse import quote
    job=app['post']('/api/new',{});folder=app['data']/'outputs'/job['id'];folder.mkdir()
    for filename in ['Previous.docx','Previous.pdf','Previous-evidence.json']:(folder/filename).write_bytes(b'saved local file')
    job['outputs']=['Previous.docx','Previous.pdf','Previous-evidence.json'];store.save_job(job)
    assert app['get']('/api/job?id='+job['id'])['outputs']==['Previous.docx']
    for filename in ['Previous.pdf','Previous-evidence.json']:
        with pytest.raises(HTTPError):app['get']('/api/file?job='+job['id']+'&name='+quote(filename))
