"""Exercise the app in a disposable local workspace with fictional details."""
import argparse
import csv
from http.cookiejar import CookieJar
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.request import build_opener, ProxyHandler, HTTPCookieProcessor, Request

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
from tests.helpers import fields
from tests.test_templates import word
from contract_maker.template_manager import inspect,digest
from contract_maker.templates import registry

parser=argparse.ArgumentParser();parser.add_argument('--app',action='store_true');args=parser.parse_args()
results=ROOT/'test-results';results.mkdir(exist_ok=True)
paragraphs=['DEMONSTRATION ONLY · Contract template','Employee: {{name_en}}','الموظف: {{name_ar}}','Date: {{execution_en}} — {{weekday_en}}','التاريخ: {{execution_ar}} — {{weekday_ar}}','Term: {{start_en}} to {{end_en}}','الفترة: {{start_ar}} إلى {{end_ar}}','Identity: {{identity_details_en}}','الهوية: {{identity_details_ar}}','Role: {{job_title_en}} | {{workplace_en}}','الوظيفة: {{job_title_ar}} | {{workplace_ar}}','Reports to: {{manager_title_en}} | {{manager_title_ar}}','Salary: USD {{salary_usd}}','الراتب: {{salary_usd}} دولار','Signed by: {{name_en}} / {{name_ar}}']
with tempfile.TemporaryDirectory(prefix='nmo-contract-check-') as temporary:
    data=Path(temporary)/'data';entries={}
    for kind in ['employment','service','extension']:
        specific=['Grade: {{grade_en}} | {{grade_ar}}'] if kind=='employment' else ['Project: {{project_en}} | {{project_ar}}','Manager: {{manager_name_en}} | {{manager_name_ar}}'] if kind=='service' else ['Original contract: {{original_en}} | {{original_ar}}']
        raw=word(paragraphs+specific);path=data/'templates'/kind/'template.docx';path.parent.mkdir(parents=True);path.write_bytes(raw)
        entries[kind]={'label':kind.title(),'path':str(path),'sha256':digest(raw),'placeholders':inspect(raw)['placeholders']}
    (data/'templates/registry.json').write_text(json.dumps(entries))
    replacement=Path(temporary)/'replacement.docx';replacement.write_bytes(word(['Updated approved wording.']+paragraphs+['Grade: {{grade_en}} | {{grade_ar}}']))
    sample=Path(temporary)/'employees.csv';values={k:v['value'] for k,v in fields().items()}
    with sample.open('w',newline='',encoding='utf-8') as handle:
        writer=csv.DictWriter(handle,fieldnames=list(values));writer.writeheader();writer.writerow(values);writer.writerow({**values,'name_en':'Test Second Employee','name_ar':'موظف تجريبي ثان غير حقيقي','identity_number':'00009876','identity_type':'refugee_card'})
    edited=Path(temporary)/'edited-contract.docx';edited.write_bytes(word(['Edited in Word · preserve this exact wording.']))
    env=dict(os.environ);env['NMO_CONTRACTS_DATA']=str(data)
    client=build_opener(ProxyHandler({}),HTTPCookieProcessor(CookieJar()))
    command=[str(ROOT/'NMO Contract Maker.app/Contents/MacOS/NMO Contract Maker')] if args.app else [sys.executable,str(ROOT/'run.py')]
    base=None;boot=None
    with (results/'integration-server.log').open('w') as log:
        process=subprocess.Popen(command+['--no-browser','--port','0'],cwd=ROOT,env=env,stdout=log,stderr=log)
        def post(route,payload):
            return json.load(client.open(Request(base+route,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Origin':base,'X-Private-CSRF':boot['csrf']}),timeout=30))
        def wait(task):
            deadline=time.monotonic()+180
            while time.monotonic()<deadline:
                item=json.load(client.open(base+'/api/task?id='+task,timeout=5))
                if item['status']=='error':raise RuntimeError(item['message'])
                if item['status']=='complete':return item['result']
                time.sleep(.2)
            raise RuntimeError('The local operation timed out.')
        try:
            for _ in range(120):
                if process.poll() is not None:raise RuntimeError('The temporary app could not start; see integration-server.log.')
                if (data/'app-address.json').exists():base=json.loads((data/'app-address.json').read_text())['url'];break
                time.sleep(.1)
            if not base:raise RuntimeError('The temporary app did not become ready.')
            client.open(base).read();boot=json.load(client.open(base+'/api/bootstrap'))
            assert boot['generation_only'] and not boot['requires_models'] and 'engine' not in boot
            (results/'browser-config.json').write_text(json.dumps({'base':base,'spreadsheet':str(sample),'replacement':str(replacement),'edited_word':str(edited),'fields':values}))
            node=shutil.which('node') or str(Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
            subprocess.run([node,str(ROOT/'tools/browser_checks.cjs')],cwd=ROOT,check=True)
            exports={}
            for kind in ['service','extension']:
                job=post('/api/new',{'kind':kind})
                result=wait(post('/api/generate',{'job':job['id'],'fields':fields(kind)})['task'])
                assert result=={'job':job['id']}
                saved=json.load(client.open(base+'/api/job?id='+job['id']))
                assert saved['last_generation']['template_text_preserved'] and saved['last_generation']['other_package_parts_unchanged']
                assert len(saved['outputs'])==1 and saved['outputs'][0].endswith('.docx')
                assert not list((data/'outputs'/job['id']).glob('*.pdf'))
                exports[kind]=len(saved['outputs'])
            report={'runtime':'packaged app' if args.app else 'Python source','all_contract_types':'Word only passed','additional_word_exports':exports,'model_engine':'not required or contacted','workspace':'disposable fictional data'}
            (results/'integration-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
        finally:
            if base and boot:
                try:post('/api/shutdown',{})
                except OSError:pass
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.terminate();process.wait(timeout=5)
