"""Explicit spreadsheet column/row imports. No inference or formula execution."""
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from io import StringIO
from pathlib import Path
import csv
import posixpath
import re
from .dates import printed_date
from .fields import FIELD_KEYS, FIELDS, normalize
from .readers import checked_zip, XML_PARSER
from lxml import etree

MAX_ROWS = 10000
MAX_COLUMNS = 120
S = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
OD = {'o': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
      't': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'}


def column_label(index):
    result = ''
    index += 1
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def column_index(label):
    if not re.fullmatch(r'[A-Z]{1,3}', label):
        raise ValueError('Choose a valid spreadsheet column.')
    result = 0
    for char in label:
        result = result * 26 + ord(char) - 64
    if not 1 <= result <= MAX_COLUMNS:
        raise ValueError('Use one of the first 120 spreadsheet columns.')
    return result - 1


def cell(value='', kind='text', formula=False, note=''):
    return {'value': str(value), 'kind': kind, 'formula': formula, 'note': note}


def read_csv(path):
    try:
        raw = Path(path).read_text(encoding='utf-8-sig')
    except UnicodeError as exc:
        raise ValueError('Save this spreadsheet as CSV UTF-8, XLSX or ODS and choose it again.') from exc
    try:
        dialect = csv.Sniffer().sniff(raw[:8192], delimiters=',;\t')
    except csv.Error:
        dialect = csv.excel
    rows = []
    for index, values in enumerate(csv.reader(StringIO(raw), dialect), 1):
        if index > MAX_ROWS:
            raise ValueError('Import a spreadsheet with at most 10,000 rows.')
        if len(values) > MAX_COLUMNS:
            raise ValueError('Import a spreadsheet with at most 120 columns.')
        cells = {column_label(i): cell(v) for i, v in enumerate(values) if v.strip()}
        if cells:
            rows.append({'number': index, 'cells': cells})
    return [{'name': 'CSV', 'rows': rows}]


def excel_date(value, date1904):
    number = Decimal(value)
    if not number.is_finite() or number < 0 or number > 110000:
        raise ValueError('Invalid spreadsheet date.')
    days = int(number)
    if date1904:
        epoch = date(1904, 1, 1)
    else:
        if days == 60:
            raise ValueError('Excel serial 60 is not a real calendar date.')
        epoch = date(1899, 12, 30) if days > 60 else date(1899, 12, 31)
    return (epoch + timedelta(days=days)).isoformat()


def read_xlsx(path):
    with checked_zip(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = etree.fromstring(archive.read('xl/sharedStrings.xml'), XML_PARSER)
            shared = [''.join(node.xpath('.//s:t/text()', namespaces=S)) for node in root]
        formats, styles = {}, []
        if 'xl/styles.xml' in archive.namelist():
            root = etree.fromstring(archive.read('xl/styles.xml'), XML_PARSER)
            formats = {int(n.get('numFmtId')): n.get('formatCode', '') for n in root.xpath('./s:numFmts/s:numFmt', namespaces=S)}
            styles = [int(n.get('numFmtId', '0')) for n in root.xpath('./s:cellXfs/s:xf', namespaces=S)]
        workbook = etree.fromstring(archive.read('xl/workbook.xml'), XML_PARSER)
        properties = workbook.find('s:workbookPr', S)
        date1904 = properties is not None and properties.get('date1904') in {'1', 'true'}
        relationships = etree.fromstring(archive.read('xl/_rels/workbook.xml.rels'), XML_PARSER)
        targets = {r.get('Id'): r.get('Target', '') for r in relationships if r.get('TargetMode') != 'External'}
        result = []
        for sheet in workbook.xpath('./s:sheets/s:sheet', namespaces=S):
            target = targets.get(sheet.get('{' + REL + '}id'), '')
            member = posixpath.normpath(target.lstrip('/') if target.startswith('/') else 'xl/' + target)
            if not member.startswith('xl/worksheets/') or member not in archive.namelist():
                raise ValueError('This workbook contains an unsupported sheet link.')
            document = etree.fromstring(archive.read(member), XML_PARSER)
            rows = []
            for row in document.xpath('./s:sheetData/s:row', namespaces=S):
                cells = {}
                for index, node in enumerate(row):
                    reference = node.get('r', column_label(index))
                    match = re.match(r'[A-Z]+', reference)
                    if not match:
                        raise ValueError('This workbook has an invalid cell address.')
                    column = match.group()
                    value = ''.join(node.xpath('./s:v/text()', namespaces=S))
                    kind = node.get('t', 'n')
                    formula = node.find('s:f', S) is not None
                    note = ''
                    if kind == 's':
                        value = shared[int(value)] if value else ''
                        kind = 'text'
                    elif kind == 'inlineStr':
                        value = ''.join(node.xpath('./s:is//s:t/text()', namespaces=S)); kind = 'text'
                    elif kind == 'e':
                        kind = 'error'
                    elif kind == 'd':
                        value = value[:10]; kind = 'date'
                    elif kind == 'n' and value:
                        style = int(node.get('s', '0'))
                        format_id = styles[style] if style < len(styles) else 0
                        pattern = formats.get(format_id, '').split(';')[0]
                        pattern = re.sub(r'"[^"]*"|\[[^\]]*\]|\\.', '', pattern)
                        if format_id in {14, 15, 16, 17, 22} or re.search(r'[dy]', pattern, re.I):
                            try:
                                value = excel_date(value, date1904); kind = 'date'
                            except (ValueError, InvalidOperation):
                                kind = 'error'; note = 'The spreadsheet date is invalid.'
                        elif re.fullmatch(r'0{2,}', pattern) and re.fullmatch(r'\d+', value):
                            value = value.zfill(len(pattern)); kind = 'number'
                        else:
                            kind = 'number'
                    else:
                        kind = 'text'
                    if value.strip() or formula:
                        column_index(column)
                        cells[column] = cell(value, kind, formula, note)
                if cells:
                    rows.append({'number': int(row.get('r', str(len(rows) + 1))), 'cells': cells})
                    if len(rows) > MAX_ROWS:
                        raise ValueError('Import at most 10,000 non-empty rows per sheet.')
            result.append({'name': sheet.get('name', 'Sheet'), 'rows': rows})
        return result


def read_ods(path):
    with checked_zip(path) as archive:
        root = etree.fromstring(archive.read('content.xml'), XML_PARSER)
    sheets = []
    for table in root.xpath('//o:table', namespaces=OD):
        rows = []; number = 0
        for row in table.xpath('./o:table-row', namespaces=OD):
            repeat = int(row.get('{' + OD['o'] + '}number-rows-repeated', '1'))
            if repeat < 1:
                raise ValueError('Invalid spreadsheet row repetition.')
            cells = {}; position = 0
            for node in row:
                if etree.QName(node).localname not in {'table-cell', 'covered-table-cell'}:
                    continue
                count = int(node.get('{' + OD['o'] + '}number-columns-repeated', '1'))
                if count < 1:
                    raise ValueError('Invalid spreadsheet column repetition.')
                office = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'
                kind = node.get(office + 'value-type', 'string')
                value = '\n'.join(''.join(p.itertext()) for p in node.xpath('./t:p', namespaces=OD))
                if kind == 'date':
                    value = node.get(office + 'date-value', value)[:10]
                elif not value and kind in {'float', 'currency', 'percentage'}:
                    value = node.get(office + 'value', '')
                formula = node.get('{' + OD['o'] + '}formula') is not None
                if value.strip() or formula:
                    if position + count > MAX_COLUMNS:
                        raise ValueError('Import a spreadsheet with at most 120 non-empty columns.')
                    for offset in range(count):
                        cells[column_label(position + offset)] = cell(value, 'date' if kind == 'date' else 'number' if kind in {'float', 'currency', 'percentage'} else 'text', formula)
                position += count
            if cells:
                if len(rows) + repeat > MAX_ROWS:
                    raise ValueError('Import at most 10,000 non-empty rows per sheet.')
                rows.extend({'number': number + i + 1, 'cells': cells} for i in range(repeat))
            number += repeat
        sheets.append({'name': table.get('{' + OD['o'] + '}name', 'Sheet'), 'rows': rows})
    return sheets


def read_workbook(path):
    suffix = Path(path).suffix.lower()
    if suffix == '.csv':
        result = read_csv(path)
    elif suffix == '.xlsx':
        result = read_xlsx(path)
    elif suffix == '.ods':
        result = read_ods(path)
    else:
        raise ValueError('Choose an XLSX, ODS or CSV spreadsheet.')
    if not any(sheet['rows'] for sheet in result):
        raise ValueError('This spreadsheet has no readable rows.')
    return result


def suggested_mapping(header):
    # Only exact field keys or exact displayed labels qualify; no fuzzy matching.
    aliases = {normalize(label).casefold(): key for key, en, ar, _ in FIELDS for label in [key, en, ar]}
    return {column: aliases.get(normalize(item['value']).casefold(), '') for column, item in header.get('cells', {}).items()}


def row_import(sheet, row_number, mappings, contract_type):
    row = next((r for r in sheet['rows'] if r['number'] == row_number), None)
    if row is None:
        raise ValueError('Choose an existing spreadsheet row.')
    if not isinstance(mappings, dict) or not mappings or len(mappings) > MAX_COLUMNS:
        raise ValueError('Map at least one spreadsheet column to a contract field.')
    selected = [key for key in mappings.values() if key]
    if len(selected) != len(set(selected)):
        raise ValueError('Each contract field can be mapped to only one column.')
    result = {}; warnings = []
    for column, key in mappings.items():
        column_index(column)
        if not key:
            continue
        if key not in FIELD_KEYS:
            raise ValueError('Choose a supported contract field.')
        item = row['cells'].get(column, cell())
        value = item['value'].strip()
        if not value:
            if item['formula']:
                warnings.append({'field': key, 'message': 'The formula in ' + column + ' has no saved value. Enter this field manually.'})
            continue
        if item['kind'] == 'error':
            warnings.append({'field': key, 'message': 'Cell ' + column + ' contains a spreadsheet error. Enter this field manually.'})
            continue
        if key.endswith('_date'):
            parsed = printed_date(value)
            if not parsed:
                warnings.append({'field': key, 'message': 'The date in ' + column + ' is ambiguous or invalid. Enter it manually as YYYY-MM-DD.'})
                continue
            value = parsed
        if key == 'contract_type' and value != contract_type:
            raise ValueError('The selected contract type differs from this spreadsheet row. Choose the correct contract type first.')
        if key in {'gender', 'identity_type'}:
            from .documents import catalog
            translations = {'ذكر': 'male', 'أنثى': 'female', 'انثى': 'female', 'جواز سفر': 'passport', 'بطاقة شخصية': 'id_card', 'الرقم الوطني': 'national_id'}
            if key=='identity_type':
                for document in catalog():
                    translations[document['ar']]=document['id'];translations[document['en'].casefold()]=document['id']
                value=translations.get(value,translations.get(value.casefold(),value))
            value = translations.get(value, value.casefold())
            allowed = {'male', 'female'} if key == 'gender' else {d['id'] for d in catalog()}
            if value not in allowed:
                warnings.append({'field': key, 'message': 'Choose a supported value for ' + key + ' manually.'})
                continue
        if key == 'identity_number' and item['kind'] == 'number':
            warnings.append({'field': key, 'message': 'This identity number is stored as a spreadsheet number. Compare every digit and any leading zeros with the identity document.'})
        if item['formula']:
            warnings.append({'field': key, 'message': 'Cell ' + column + ' uses its saved formula result. Formulas are not recalculated; check the value against the source.'})
        result[key] = {'value': value, 'column': column, 'row': row_number, 'formula': item['formula']}
    return {'fields': result, 'warnings': warnings}
