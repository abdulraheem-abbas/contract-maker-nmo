from zipfile import ZipFile
import pytest
from contract_maker import config
from contract_maker.documents import catalog,add_type,document_type
from contract_maker.fields import validate
from contract_maker.templates import render_values,generate,parse,text
from contract_maker.spreadsheets import read_workbook,row_import
from tests.helpers import fields
from tests.test_templates import word


def test_refugee_and_residence_labels_keep_numbers_and_correct_arabic_agreement():
    for kind,ar,en in [('refugee_card','بطاقة لاجئ','Refugee Card'),('asylum_card','بطاقة طالب لجوء','Asylum-seeker Card'),('residence_card','بطاقة إقامة','Residence Card')]:
        values=fields();values['identity_type']['value']=kind
        assert not validate(values,True)
        output=render_values(values)
        assert ar in output['identity_details_ar'] and 'صادرة' in output['identity_details_ar']
        assert en in output['identity_details_en'] and '00001234' in output['identity_details_en']


def test_custom_type_is_saved_once_and_rendered_in_both_languages(tmp_path,monkeypatch):
    monkeypatch.setattr(config,'DATA',tmp_path)
    document=add_type('تصريح خاص','Special Permit','صادر','a')
    assert add_type('تصريح خاص','Special Permit','صادر','a')['id']==document['id']
    assert document_type(document['id'])['ar']=='تصريح خاص'
    values=fields();values['identity_type']['value']=document['id']
    assert not validate(values,True)
    source=tmp_path/'template.docx';source.write_bytes(word(['{{identity_details_ar}}','{{identity_details_en}}']))
    target=tmp_path/'generated.docx';generate(source,values,target)
    with ZipFile(target) as z:body=text(parse(z.read('word/document.xml')))
    assert 'تصريح خاص' in body and 'صادر' in body and 'a Special Permit number 00001234' in body


def test_custom_type_requires_correct_languages_and_valid_grammar(tmp_path,monkeypatch):
    monkeypatch.setattr(config,'DATA',tmp_path)
    with pytest.raises(ValueError,match='Arabic'):add_type('Wrong language','Special Permit')
    with pytest.raises(ValueError,match='English'):add_type('تصريح خاص','وثيقة')
    with pytest.raises(ValueError,match='grammar'):add_type('تصريح خاص','Special Permit','wrong','a')
    assert len(catalog())==6


def test_refugee_type_can_be_explicitly_mapped_from_spreadsheet(tmp_path):
    path=tmp_path/'test.csv';path.write_text('document\nRefugee Card\n')
    sheet=read_workbook(path)[0]
    assert row_import(sheet,2,{'A':'identity_type'},'employment')['fields']['identity_type']['value']=='refugee_card'
