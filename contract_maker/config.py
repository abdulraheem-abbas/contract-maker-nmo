from pathlib import Path
import os
import sys

if getattr(sys, "frozen", False):
    RESOURCES = Path(sys._MEIPASS)
    executable = Path(sys.executable).resolve()
    ROOT = executable.parents[3] if ".app/" in str(executable) else executable.parent
else:
    ROOT = Path(__file__).resolve().parent.parent
    RESOURCES = ROOT
DATA = Path(os.environ.get("NMO_CONTRACTS_DATA", str(ROOT / "data"))).resolve()
APP_NAME = "NMO Contract Maker"
DEFAULT_PORT = 8770
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png", ".ods", ".xlsx", ".csv", ".txt"}

def initialize():
    os.umask(0o077)
    for folder in ["", "sources", "templates", "outputs", "cache", "logs", "records"]:
        path = DATA / folder
        path.mkdir(parents=True, exist_ok=True)
        try:
            path.chmod(0o700)
        except OSError:
            pass
