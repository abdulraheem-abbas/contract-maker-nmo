from pathlib import Path
from zipfile import ZipFile
import ast
import subprocess
import sys
import pytest
from contract_maker.fields import validate, weekday, salary_amount, salary_words
from contract_maker.dates import printed_date
from contract_maker.templates import parse, text, NS, W, replace_range, generate, render_values, registry
from contract_maker.checks import calculations, check_fields
from tests.helpers import fields
from tests.test_templates import word


def test_weekdays_money_leading_zeros_and_inclusive_period():
    values=fields();assert not validate(values,True)
    assert weekday('2026-10-01')=='Thursday'
    assert weekday('2026-10-16','ar')=='الجمعة'
    result=render_values(values)
    assert '00001234' in result['identity_details_ar']
    assert 'Passport' in result['identity_details_en']
    assert salary_amount('٨٢٥.٦٩')==salary_amount('825.69')
    assert 'Sixty-Nine' in salary_words('825.69','en')
    summary=calculations(values)
    assert summary['calendar_days']==92 and summary['weekday_en']=='Thursday'


@pytest.mark.parametrize('value',['NaN','Infinity','-1','0','825.699'])
def test_invalid_salary_refused(value):
    with pytest.raises(ValueError):salary_amount(value)


@pytest.mark.parametrize('key,value,level',[
    ('end_date','2026-01-01','error'),('identity_expiry_date','2024-06-01','warning'),
    ('identity_expiry_date','2023-01-01','error'),('issuer_en','Taiz','error'),
    ('issuer_ar','مركز - عدن-١','error'),('job_title_en','Assistant in the project Sample','error'),
    ('identity_type','driver_license','error'),('gender','unknown','error')])
def test_invalid_contract_fields_flagged(key,value,level):
    values=fields();values[key]['value']=value
    assert any(i['field']==key and i['level']==level for i in validate(values,True))


def test_dates_do_not_guess_ambiguous_numeric_order():
    assert printed_date('1 October 2026')=='2026-10-01'
    assert printed_date('١ أكتوبر ٢٠٢٦')=='2026-10-01'
    assert printed_date('31/12/2026')=='2026-12-31'
    assert printed_date('2026/10/01')=='2026-10-01'
    assert printed_date('01/10/2026') is None
    assert printed_date('31/02/2026') is None


def test_identity_document_labels_and_optional_issuer():
    values=fields();values['issuer_ar']['value']='';values['issuer_en']['value']=''
    result=render_values(values)
    assert 'صادر بتاريخ' in result['identity_details_ar'] and ' من ' not in result['identity_details_ar']
    assert 'issued on ' in result['identity_details_en'] and 'issued in ' not in result['identity_details_en']
    values['identity_type']['value']='national_id'
    assert 'الرقم الوطني' in render_values(values)['identity_details_ar']
    values['identity_type']['value']='id_card'
    assert 'بطاقة شخصية رقم' in render_values(values)['identity_details_ar']


def test_unconfirmed_optional_details_and_saved_role_rules_block_generation():
    values=fields();values['issuer_ar']['confirmed']=False
    assert any(i['field']=='issuer_ar' and i['level']=='error' for i in validate(values,True))
    rules={'job_title_overrides':[{'name_ar':values['name_ar']['value'],'job_title_en':'Shelter Field Assistant','job_title_ar':'مساعد ميداني للمأوى'}]}
    result=check_fields(values,{},rules,True)
    assert any(i['field']=='job_title_en' and i['level']=='error' for i in result)


def test_split_rtl_field_preserves_run_formatting_and_nontext_elements():
    paragraph=parse(('<w:p xmlns:w="'+NS['w']+'"><w:r><w:rPr><w:rtl/></w:rPr><w:tab/><w:t>before {{na</w:t></w:r><w:hyperlink w:anchor="x"><w:r><w:rPr><w:i/></w:rPr><w:t>me_ar}} after</w:t><w:br/></w:r></w:hyperlink></w:p>').encode())
    body=text(paragraph);replace_range(paragraph,body.index('{{'),body.index('}}')+2,'اسم تجريبي')
    assert text(paragraph)=='before اسم تجريبي after'
    assert paragraph.xpath('.//w:tab',namespaces=NS) and paragraph.xpath('.//w:br',namespaces=NS)
    run=paragraph.xpath('.//w:r[w:t="اسم تجريبي"]',namespaces=NS)[0]
    assert run.find('w:rPr/w:b',NS).get(W+'val')=='1'
    assert run.find('w:rPr/w:bCs',NS).get(W+'val')=='1'
    assert run.find('w:rPr/w:rtl',NS) is not None
    assert paragraph.xpath('.//w:hyperlink/w:r/w:rPr/w:i',namespaces=NS)


def test_generation_preserves_fixed_text_and_other_package_parts(tmp_path):
    template=tmp_path/'template.docx';template.write_bytes(word(['Fixed {{name_ar}} / {{identity_number}} end.'],{'word/media/example.bin':b'unchanged-image'}))
    output=tmp_path/'filled.docx';proof=generate(template,fields(),output)
    assert proof['template_text_preserved'] and proof['other_package_parts_unchanged']
    with ZipFile(output) as result:
        assert result.read('word/media/example.bin')==b'unchanged-image'
        assert text(parse(result.read('word/document.xml')))=='Fixed موظف تجريبي غير حقيقي / 00001234 end.'


@pytest.mark.parametrize('kind',['employment','service','extension'])
def test_configured_private_template_fills_without_changes_to_other_parts(tmp_path,kind):
    entry=registry().get(kind,{})
    if not entry.get('path'):pytest.skip('Private local template not configured')
    destination=tmp_path/'contract.docx';proof=generate(entry['path'],fields(kind),destination)
    with ZipFile(destination) as result:
        body=text(parse(result.read('word/document.xml')))
    assert '{{' not in body and 'Test Employee Example' in body and '00001234' in body
    assert proof['template_text_preserved'] and proof['other_package_parts_unchanged']


def test_application_has_no_model_ocr_or_contract_review_dependencies():
    root=Path(__file__).resolve().parents[1]/'contract_maker'
    assert not any((root/name).exists() for name in ['engine.py','extract.py','review.py'])
    forbidden={'ollama','openai','anthropic','transformers','torch','pytesseract'}
    for path in root.glob('*.py'):
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node,ast.Import):assert not any(n.name.split('.')[0] in forbidden for n in node.names)
            if isinstance(node,ast.ImportFrom):assert (node.module or '').split('.')[0] not in forbidden|{'engine','extract','review'}


def test_runtime_refuses_external_networks():
    code='''from contract_maker.privacy import install_network_guard,LocalOnlyError
import socket
install_network_guard()
for action in [lambda:socket.getaddrinfo("example.com",443),lambda:socket.socket().connect(("1.1.1.1",443)),lambda:socket.socket(socket.AF_INET,socket.SOCK_DGRAM).sendto(b"test",("1.1.1.1",53))]:
    try:action()
    except LocalOnlyError:pass
    else:raise AssertionError("External connection allowed")
print("blocked")'''
    result=subprocess.run([sys.executable,'-c',code],capture_output=True,text=True)
    assert result.returncode==0 and result.stdout.strip()=='blocked'
