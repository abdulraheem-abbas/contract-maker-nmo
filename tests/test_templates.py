"""Template changes use fictional Word packages and an isolated local store."""
from copy import deepcopy
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import base64
import json
import threading
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import build_opener, ProxyHandler, HTTPCookieProcessor, Request
import pytest
from lxml import etree
from contract_maker import template_manager as manager, templates
from contract_maker.templates import W, NS, parse, text, generate
from contract_maker.fields import empty_fields


def word(paragraphs=None, extra=None):
    paragraphs=paragraphs or ['Fixed approved wording.', '{{name_ar}}', '{{name_en}}', '{{execution_ar}} / {{execution_en}}', '{{start_ar}} / {{end_ar}}']
    root=etree.Element(W+'document',nsmap={'w':NS['w']})
    body=etree.SubElement(root,W+'body')
    for value in paragraphs:
        p=etree.SubElement(body,W+'p');r=etree.SubElement(p,W+'r')
        etree.SubElement(r,W+'t').text=value
    data={'[Content_Types].xml':b'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
          '_rels/.rels':b'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
          'word/document.xml':etree.tostring(root), **(extra or {})}
    out=BytesIO()
    with ZipFile(out,'w') as z:
        for name,raw in data.items():z.writestr(name,raw)
    return out.getvalue()


@pytest.fixture
def workspace(tmp_path,monkeypatch):
    monkeypatch.setattr(manager,'DATA',tmp_path)
    monkeypatch.setattr(templates,'DATA',tmp_path)
    folder=tmp_path/'templates/employment';folder.mkdir(parents=True)
    raw=word();path=folder/'template.docx';path.write_bytes(raw)
    entry={'label':'Test employment','path':str(path),'sha256':manager.digest(raw),'placeholders':manager.inspect(raw)['placeholders']}
    (tmp_path/'templates/registry.json').write_text(json.dumps({'employment':entry}))
    return tmp_path,entry,raw


def test_template_draft_activation_and_restore_preserve_originals(workspace):
    root,entry,original=workspace
    updated=word(['Updated approved clause.','{{name_ar}}','{{name_en}}','{{execution_ar}}','{{start_ar}} — {{end_ar}}'])
    draft=manager.stage('employment','updated.docx',updated,entry['sha256'])
    assert manager.active('employment')[1]==original
    assert not draft['errors']
    manager.activate('employment',draft['draft'],draft['sha256'],True)
    active,raw=manager.active('employment')
    assert raw==updated and active['version']
    assert (root/'templates/employment/template.docx').read_bytes()==original
    history=manager.describe('employment')['history']
    assert len(history)==1 and 'path' not in history[0]
    restore=manager.restore_draft('employment',history[0]['version'],active['sha256'])
    assert manager.active('employment')[1]==updated
    manager.activate('employment',restore['draft'],restore['sha256'],True)
    assert manager.active('employment')[1]==original
    assert len(manager.describe('employment')['history'])==2
    assert manager.file_path('employment',version=active['version']).read_bytes()==updated


def test_mapping_changes_draft_only_and_retains_other_package_parts(workspace):
    _,entry,original=workspace
    raw=word(['Fixed approved wording.','اسم تجريبي','{{name_en}}','{{execution_ar}}','{{start_ar}} / {{end_ar}}'],{'word/media/test.bin':b'unchanged image'})
    draft=manager.stage('employment','new.docx',raw,entry['sha256'])
    assert any('Arabic' in e for e in draft['errors'])
    mapped=manager.map_fields('employment',draft['draft'],draft['sha256'],[{'paragraph':1,'before':'اسم تجريبي','key':'name_ar'}])
    assert not mapped['errors'] and mapped['draft']!=draft['draft']
    assert manager.file_path('employment',draft['draft']).read_bytes()==raw
    with ZipFile(manager.file_path('employment',mapped['draft'])) as z:
        assert z.read('word/media/test.bin')==b'unchanged image'
        r=parse(z.read('word/document.xml'))
        assert '{{name_ar}}' in text(r)
        assert r.xpath('//w:r[w:t="{{name_ar}}" ]/w:rPr/w:bCs',namespaces=NS)
    assert manager.active('employment')[1]==original


def test_activation_requires_review_and_supported_mapped_fields(workspace):
    _,entry,_=workspace
    draft=manager.stage('employment','not-mapped.docx',word(['A fixed contract for Sample Employee.']),entry['sha256'])
    with pytest.raises(ValueError,match='Check the template wording'):
        manager.activate('employment',draft['draft'],draft['sha256'],False)
    with pytest.raises(ValueError,match='Map the employee name'):
        manager.activate('employment',draft['draft'],draft['sha256'],True)
    malformed=manager.stage('employment','unknown.docx',word(['{{name_ar}}','{{name_en}}','{{unknown_field}}','{{execution_ar}}','{{start_ar}} {{end_ar}}']),entry['sha256'])
    assert any('Unsupported field' in e for e in malformed['errors'])
    with pytest.raises(ValueError,match='Unsupported field'):
        manager.activate('employment',malformed['draft'],malformed['sha256'],True)


def test_stale_tabs_cannot_overwrite_new_template(workspace):
    _,entry,_=workspace
    first=manager.stage('employment','first.docx',word(),entry['sha256'])
    second=manager.stage('employment','second.docx',word(['New wording.','{{name_ar}}','{{name_en}}','{{execution_ar}}','{{start_ar}} {{end_ar}}']),entry['sha256'])
    manager.activate('employment',second['draft'],second['sha256'],True)
    with pytest.raises(ValueError,match='changed since this draft'):
        manager.activate('employment',first['draft'],first['sha256'],True)
    with pytest.raises(ValueError,match='changed'):
        manager.map_fields('employment',None,entry['sha256'],[{'paragraph':0,'before':'Fixed','key':'name_ar'}])
    assert manager.active('employment')[1]==manager.file_path('employment',second['draft']).read_bytes()


def test_mapping_active_template_starts_a_draft(workspace):
    _,entry,raw=workspace
    mapped=manager.map_fields('employment',None,entry['sha256'],[{'paragraph':0,'before':'Fixed approved wording.','key':'project_en'}])
    assert mapped['draft'] and '{{project_en}}' in str(mapped['paragraphs'])
    assert manager.active('employment')[1]==raw


@pytest.mark.parametrize('extra,message',[
    ({'word/vbaProject.bin':b'x'},'macros'),
    ({'word/embeddings/file.bin':b'x'},'embedded'),
    ({'../escape.xml':b'<x/>'},'invalid part'),
    ({'word/_rels/document.xml.rels':b'<Relationships><Relationship TargetMode="External" Type="test/image" Target="https://example.invalid/image"/></Relationships>'},'linked images'),
])
def test_unsafe_word_packages_rejected(extra,message):
    with pytest.raises(ValueError,match=message):manager.inspect(word(extra=extra))


def test_header_tokens_and_incomplete_tags_block_activation():
    report=manager.inspect(word(extra={'word/header1.xml':('<w:hdr xmlns:w="'+NS['w']+'"><w:p><w:r><w:t>{{name_en}}</w:t></w:r></w:p></w:hdr>').encode()}))
    assert any('headers' in e for e in report['errors'])
    assert any('incomplete' in e for e in manager.inspect(word(['{{name_ar}']))['errors'])
    with pytest.raises(ValueError,match='could not be read'):manager.inspect(b'not a Word package')


def test_unknown_versions_and_modified_local_templates_are_refused(workspace):
    root,entry,_=workspace
    with pytest.raises(ValueError,match='changed'):
        manager.file_path('employment',expected_sha='0'*64)
    with pytest.raises(ValueError):manager.file_path('employment','../../registry.json')
    with pytest.raises(ValueError):manager.file_path('employment',version='0'*32)
    (root/'templates/employment/template.docx').write_bytes(word(['Modified outside app']))
    with pytest.raises(ValueError,match='changed outside'):manager.active('employment')


def test_template_http_routes_are_local_authenticated_and_versioned(workspace,monkeypatch):
    from contract_maker import server
    root,entry,_=workspace
    monkeypatch.setattr(server,'DATA',root)
    app=server.AppServer(('127.0.0.1',0),server.Handler)
    thread=threading.Thread(target=app.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{app.server_port}'
    client=build_opener(ProxyHandler({}),HTTPCookieProcessor(CookieJar()))
    def post(route,payload,origin=None):
        return json.load(client.open(Request(base+route,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Origin':origin or base,'X-Private-CSRF':server.CSRF})))
    try:
        with pytest.raises(HTTPError) as error:client.open(base+'/api/template-file?kind=employment')
        assert error.value.code==403
        client.open(base).read()
        current=json.load(client.open(base+'/api/template-editor?kind=employment'))
        assert current['sha256']==entry['sha256']
        payload={'kind':'employment','name':'updated.docx','data':base64.b64encode(word()).decode(),'expected_sha':entry['sha256']}
        with pytest.raises(HTTPError) as error:post('/api/template-import',payload,'https://outside.invalid')
        assert error.value.code==403
        draft=post('/api/template-import',payload)
        post('/api/template-activate',{'kind':'employment','draft':draft['draft'],'expected_sha':draft['sha256'],'reviewed':True})
        assert client.open(base+'/api/template-file?kind=employment').read()==word()
        with pytest.raises(HTTPError):client.open(base+'/api/template-file?kind=../../registry.json')
    finally:
        app.shutdown();app.server_close();thread.join(timeout=2)
