@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" "run.py"
) else (
  echo Create a Python environment and install requirements before using this source launcher.
  echo The packaged application in this project is for Mac. Windows needs a separate build.
  pause
)
