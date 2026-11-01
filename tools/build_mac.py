"""Build the local Mac launcher; preserves any previous build as a backup."""
import os,sys,subprocess,shutil,time
from pathlib import Path
root=Path(__file__).resolve().parent.parent
env=dict(os.environ);env['PYINSTALLER_CONFIG_DIR']=str(root/'build/pyinstaller-cache')
subprocess.run([sys.executable,'-m','PyInstaller','--noconfirm','--windowed','--onedir','--name','NMO Contract Maker','--osx-bundle-identifier','org.nmo.contractmaker','--add-data','web:web','--collect-all','pypdfium2','--collect-all','num2words','run.py'],cwd=root,env=env,check=True)
target=root/'NMO Contract Maker.app'
if target.exists():shutil.move(str(target),str(root/'build'/('Previous app '+str(int(time.time()))+'.app')))
shutil.move(str(root/'dist/NMO Contract Maker.app'),str(target))
print('Built '+str(target))
