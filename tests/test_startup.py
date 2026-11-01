from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import hashlib
import json
import os
from pathlib import Path
import sys
import threading
import pytest
from contract_maker import __main__ as startup,server
from contract_maker.config import APP_NAME,DEFAULT_PORT


@pytest.fixture
def running_app(tmp_path,monkeypatch):
    monkeypatch.setattr(startup,'DATA',tmp_path)
    response={'application':APP_NAME,'data_id':hashlib.sha256(str(tmp_path).encode()).hexdigest()}
    class Ping(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def do_GET(self):
            raw=json.dumps(response).encode();self.send_response(200);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    http=ThreadingHTTPServer(('127.0.0.1',0),Ping)
    thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
    try:yield tmp_path,http.server_port,response
    finally:http.shutdown();http.server_close();thread.join(timeout=2)


def test_existing_app_is_found_when_address_file_is_missing(running_app):
    folder,port,_=running_app
    assert not (folder/'app-address.json').exists()
    assert startup.existing_instance(port)==f'http://127.0.0.1:{port}'


def test_stale_or_external_saved_address_falls_back_to_local_app(running_app):
    folder,port,_=running_app
    for address in ['http://127.0.0.1:1','https://outside.invalid:443']:
        (folder/'app-address.json').write_text(json.dumps({'url':address,'pid':0}))
        assert startup.existing_instance(port)==f'http://127.0.0.1:{port}'


def test_another_workspace_is_never_reused(running_app):
    _,port,response=running_app;response['data_id']='different workspace'
    assert startup.existing_instance(port) is None


@pytest.mark.parametrize('arguments,expected',[([],8770),(['--port','0'],0)])
def test_normal_launch_uses_fixed_address_and_tests_can_request_free_port(monkeypatch,arguments,expected):
    calls=[]
    monkeypatch.setattr(sys,'argv',['run.py','--no-browser']+arguments)
    monkeypatch.setattr(startup,'initialize',lambda:None)
    monkeypatch.setattr(startup,'existing_instance',lambda preferred:None)
    monkeypatch.setattr(startup,'serve',lambda port,open_browser:calls.append((port,open_browser)))
    startup.main();assert calls==[(expected,False)]
    assert DEFAULT_PORT==8770


def test_shutting_down_an_old_instance_does_not_remove_new_instance_address(tmp_path,monkeypatch):
    monkeypatch.setattr(server,'DATA',tmp_path)
    monkeypatch.setattr(server,'initialize',lambda:None)
    monkeypatch.setattr(server,'install_network_guard',lambda:None)
    class FakeServer:
        server_port=8770
        def serve_forever(self):
            (tmp_path/'app-address.json').write_text(json.dumps({'url':'http://127.0.0.1:8770','pid':os.getpid()+1}))
            raise RuntimeError('Simulated old instance shutdown')
        def server_close(self):pass
    monkeypatch.setattr(server,'AppServer',lambda *args:FakeServer())
    with pytest.raises(RuntimeError):server.serve(open_browser=False)
    assert json.loads((tmp_path/'app-address.json').read_text())['pid']==os.getpid()+1
