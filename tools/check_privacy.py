"""Verify the Mac outbound restriction with dummy connections only."""
import json
from pathlib import Path
import socket
import subprocess
import sys
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
from contract_maker.privacy import MAC_NETWORK_PROFILE

if sys.platform!='darwin':
    raise SystemExit('This operating-system privacy check is for the prepared Mac version.')
listener=socket.socket();listener.bind(('127.0.0.1',0));listener.listen(1)
code='''import socket,sys
external=socket.socket();external.settimeout(3)
try:external.connect(("1.1.1.1",443))
except PermissionError:pass
else:raise AssertionError("Outbound connection was not denied by the operating system")
finally:external.close()
local=socket.socket();local.settimeout(3);local.connect(("127.0.0.1",int(sys.argv[1])));local.close()
print("outbound denied; loopback allowed")'''
try:
    result=subprocess.run(['/usr/bin/sandbox-exec','-p',MAC_NETWORK_PROFILE,sys.executable,'-c',code,str(listener.getsockname()[1])],text=True,capture_output=True,timeout=10)
    assert result.returncode==0,result.stderr
finally:listener.close()
report={'mac_outbound_restriction':'external denied; loopback allowed','no_employee_content_used':True}
(ROOT/'test-results').mkdir(exist_ok=True)
(ROOT/'test-results/privacy-check.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
