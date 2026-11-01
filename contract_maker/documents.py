"""Bilingual identity document labels, with immutable locally added choices."""
from copy import deepcopy
import json
import os
import re
import threading
import unicodedata
import uuid
from . import config

LOCK=threading.RLock()
DEFAULTS=[
    {'id':'id_card','ar':'بطاقة شخصية','en':'ID Card','verb_ar':'صادرة','article_en':'an'},
    {'id':'national_id','ar':'بطاقة شخصية بالرقم الوطني','en':'ID Card with National Number','verb_ar':'صادرة','article_en':'an','national_number':True},
    {'id':'passport','ar':'جواز سفر','en':'Passport','verb_ar':'صادر','article_en':'a'},
    {'id':'refugee_card','ar':'بطاقة لاجئ','en':'Refugee Card','verb_ar':'صادرة','article_en':'a'},
    {'id':'asylum_card','ar':'بطاقة طالب لجوء','en':'Asylum-seeker Card','verb_ar':'صادرة','article_en':'an'},
    {'id':'residence_card','ar':'بطاقة إقامة','en':'Residence Card','verb_ar':'صادرة','article_en':'a'},
]


def clean(value):
    value=re.sub(r'\s+',' ',unicodedata.normalize('NFKC',str(value))).strip()
    if not 1<=len(value)<=120 or re.search(r'[\x00-\x1f{}]',value):
        raise ValueError('Use a document label between 1 and 120 characters, without field tags or control characters.')
    return value


def catalog():
    with LOCK:
        path=config.DATA/'identity-types.json'
        custom=json.loads(path.read_text()) if path.exists() else []
        if not isinstance(custom,list):raise ValueError('The local identity-type list could not be read.')
        result=deepcopy(DEFAULTS);seen={d['id'] for d in result}
        for item in custom:
            if not isinstance(item,dict) or not re.fullmatch(r'custom_[a-f0-9]{32}',str(item.get('id',''))) or item['id'] in seen:
                raise ValueError('A local identity-type entry is invalid.')
            if item.get('verb_ar') not in {'صادر','صادرة'} or item.get('article_en') not in {'a','an',''}:
                raise ValueError('A local identity-type entry has invalid grammar choices.')
            entry={k:item[k] for k in ['id','ar','en','verb_ar','article_en']}
            entry['ar']=clean(entry['ar']);entry['en']=clean(entry['en'])
            result.append(entry);seen.add(entry['id'])
        return result


def document_type(kind):
    entry=next((d for d in catalog() if d['id']==kind),None)
    if not entry:raise ValueError('Choose an available identity document type.')
    return entry


def add_type(ar,en,verb_ar='صادرة',article_en='a'):
    ar=clean(ar);en=clean(en)
    if not re.search(r'[\u0621-\u064a]',ar):raise ValueError('Enter the Arabic document name in Arabic.')
    if not re.search(r'[A-Za-z]',en):raise ValueError('Enter the English document name in English.')
    if verb_ar not in {'صادر','صادرة'} or article_en not in {'a','an',''}:raise ValueError('Choose valid Arabic and English grammar options.')
    with LOCK:
        existing=catalog()
        duplicate=next((d for d in existing if d['ar']==ar and d['en'].casefold()==en.casefold()),None)
        if duplicate:return duplicate
        entry={'id':'custom_'+uuid.uuid4().hex,'ar':ar,'en':en,'verb_ar':verb_ar,'article_en':article_en}
        custom=[d for d in existing if d['id'].startswith('custom_')]+[entry]
        config.DATA.mkdir(parents=True,exist_ok=True)
        path=config.DATA/'identity-types.json';temporary=path.with_suffix('.'+uuid.uuid4().hex+'.tmp')
        try:
            temporary.write_text(json.dumps(custom,ensure_ascii=False,indent=2));os.replace(temporary,path)
        finally:temporary.unlink(missing_ok=True)
        return entry
