import argparse
import hashlib
import http.client
import json
import os
import sys
import webbrowser
from .config import DATA,APP_NAME,DEFAULT_PORT,initialize
from .server import serve

def existing_instance(preferred_port=DEFAULT_PORT):
    candidates=[]
    try:
        entry=json.loads((DATA/'app-address.json').read_text())
        from urllib.parse import urlparse
        url=urlparse(entry['url'])
        if url.scheme=='http' and url.hostname=='127.0.0.1' and url.port:candidates.append(url.port)
    except (OSError,ValueError,KeyError):pass
    if preferred_port and preferred_port not in candidates:candidates.append(preferred_port)
    expected=hashlib.sha256(str(DATA).encode()).hexdigest()
    for port in candidates:
        conn=None
        try:
            conn=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
            conn.request('GET','/api/ping',headers={'Host':f'127.0.0.1:{port}'})
            result=json.loads(conn.getresponse().read())
            if result.get('application')==APP_NAME and result.get('data_id')==expected:return f'http://127.0.0.1:{port}'
        except (OSError,ValueError,http.client.HTTPException):pass
        finally:
            if conn:conn.close()
    return None

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=DEFAULT_PORT)
    parser.add_argument('--no-browser',action='store_true')
    parser.add_argument('--diagnose',action='store_true',help=argparse.SUPPRESS)
    args=parser.parse_args()
    initialize()
    if args.diagnose:
        from .privacy import install_network_guard
        install_network_guard()
        from . import store,templates,office
        from .server import rules
        for label,operation in [('workspaces',store.jobs),('templates',templates.registry),('rules',rules),('office',office.office_binary)]:
            try:operation();print(label+': ok',flush=True)
            except Exception:
                import traceback
                print(label+': failed',flush=True);traceback.print_exc()
        return
    existing=existing_instance(args.port)
    if existing:
        if not args.no_browser:webbrowser.open(existing)
        elif sys.stdout is not None:print(existing)
        return
    serve(args.port,not args.no_browser)

if __name__=='__main__':main()
