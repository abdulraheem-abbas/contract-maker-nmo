from io import BytesIO
from zipfile import ZipFile
import pytest
from contract_maker.spreadsheets import read_workbook,row_import,suggested_mapping,column_index,column_label


def test_csv_preserves_zeroes_and_requires_explicit_row_and_column_mapping(tmp_path):
    path=tmp_path/'staff.csv';path.write_text('Employee,Document,Pay,Start\nTest First,00001234,825.69,2026-10-01\nTest Second,00009876,900.25,01/10/2026\n')
    sheet=read_workbook(path)[0]
    assert not any(suggested_mapping(sheet['rows'][0]).values())
    imported=row_import(sheet,2,{'A':'name_en','B':'identity_number','C':'salary_usd','D':'start_date'},'employment')
    assert imported['fields']['identity_number']['value']=='00001234'
    assert imported['fields']['salary_usd']['value']=='825.69'
    second=row_import(sheet,3,{'A':'name_en','D':'start_date'},'employment')
    assert second['fields']['name_en']['value']=='Test Second'
    assert 'start_date' not in second['fields'] and second['warnings']


def test_csv_handles_utf8_arabic_quoted_newlines_and_semicolon_delimiter(tmp_path):
    path=tmp_path/'staff.csv';path.write_text('\ufeffname_ar;name_en\n"اسم تجريبي\nكامل";Test Employee\n',encoding='utf-8')
    sheet=read_workbook(path)[0]
    assert suggested_mapping(sheet['rows'][0])=={'A':'name_ar','B':'name_en'}
    result=row_import(sheet,2,{'A':'name_ar','B':'name_en'},'employment')
    assert result['fields']['name_ar']['value']=='اسم تجريبي\nكامل'


def test_mapping_duplicates_unknown_fields_and_wrong_rows_are_refused(tmp_path):
    path=tmp_path/'staff.csv';path.write_text('A,B\none,two\n')
    sheet=read_workbook(path)[0]
    with pytest.raises(ValueError,match='only one column'):row_import(sheet,2,{'A':'name_en','B':'name_en'},'employment')
    with pytest.raises(ValueError,match='existing spreadsheet row'):row_import(sheet,9,{'A':'name_en'},'employment')
    with pytest.raises(ValueError,match='supported contract field'):row_import(sheet,2,{'A':'made_up'},'employment')


def xlsx(tmp_path,worksheet,date1904=False):
    path=tmp_path/'staff.xlsx'
    parts={
        'xl/workbook.xml':f'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="{int(date1904)}"/><sheets><sheet name="Employees" sheetId="1" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/styles.xml':'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts><numFmt numFmtId="164" formatCode="00000000"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>',
        'xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+worksheet+'</sheetData></worksheet>'}
    with ZipFile(path,'w') as archive:
        for name,value in parts.items():archive.writestr(name,value)
    return path


def test_xlsx_dates_numeric_formats_and_formula_results_are_explicit(tmp_path):
    path=xlsx(tmp_path,'<row r="6"><c r="A6" s="2"><v>1234</v></c><c r="B6" s="1"><v>46296</v></c><c r="C6"><f>800+25.69</f><v>825.69</v></c><c r="D6"><f>1+2</f></c><c r="E6" t="e"><v>#VALUE!</v></c></row>')
    sheet=read_workbook(path)[0]
    assert sheet['rows'][0]['number']==6
    result=row_import(sheet,6,{'A':'identity_number','B':'start_date','C':'salary_usd','D':'grade_en','E':'job_title_en'},'employment')
    assert result['fields']['identity_number']['value']=='00001234'
    assert result['fields']['start_date']['value']=='2026-10-01'
    assert result['fields']['salary_usd']['value']=='825.69'
    assert 'grade_en' not in result['fields'] and 'job_title_en' not in result['fields']
    assert len(result['warnings'])==4


def test_xlsx_1904_dates_and_imaginary_leap_day(tmp_path):
    sheet=read_workbook(xlsx(tmp_path,'<row r="1"><c r="A1" s="1"><v>1</v></c></row>',True))[0]
    assert row_import(sheet,1,{'A':'start_date'},'employment')['fields']['start_date']['value']=='1904-01-02'
    sheet=read_workbook(xlsx(tmp_path,'<row r="1"><c r="A1" s="1"><v>60</v></c></row>'))[0]
    result=row_import(sheet,1,{'A':'start_date'},'employment')
    assert not result['fields'] and result['warnings']


def test_ods_row_numbers_dates_and_displayed_number_are_preserved(tmp_path):
    path=tmp_path/'staff.ods'
    with ZipFile(path,'w') as archive:
        archive.writestr('content.xml','''<root xmlns:o="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:t="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:v="urn:oasis:names:tc:opendocument:xmlns:office:1.0"><o:table o:name="Staff"><o:table-row o:number-rows-repeated="5"><o:table-cell/></o:table-row><o:table-row><o:table-cell v:value-type="string"><t:p>Test Employee</t:p></o:table-cell><o:table-cell v:value-type="float" v:value="1234"><t:p>00001234</t:p></o:table-cell><o:table-cell v:value-type="date" v:date-value="2026-10-01"><t:p>01/10/2026</t:p></o:table-cell></o:table-row></o:table></root>''')
    sheet=read_workbook(path)[0]
    assert sheet['rows'][0]['number']==6
    result=row_import(sheet,6,{'A':'name_en','B':'identity_number','C':'start_date'},'employment')
    assert result['fields']['identity_number']['value']=='00001234'
    assert result['fields']['start_date']['value']=='2026-10-01'
    assert result['warnings'][0]['field']=='identity_number'


def test_enum_values_are_explicit_and_column_names_are_validated(tmp_path):
    path=tmp_path/'staff.csv';path.write_text('الجنس,الوثيقة,النوع\nذكر,جواز سفر,service\n')
    sheet=read_workbook(path)[0]
    imported=row_import(sheet,2,{'A':'gender','B':'identity_type'},'service')
    assert imported['fields']['gender']['value']=='male' and imported['fields']['identity_type']['value']=='passport'
    with pytest.raises(ValueError,match='contract type differs'):row_import(sheet,2,{'C':'contract_type'},'employment')
    assert column_label(26)=='AA' and column_index('AA')==26
    with pytest.raises(ValueError):column_index('../A')
