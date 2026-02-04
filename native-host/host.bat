@echo off
cd /d "%~dp0"
if not exist "C:\Program Files\nodejs\node.exe" (
    echo Node.js not found at C:\Program Files\nodejs\node.exe
    exit /b 1
)
"C:\Program Files\nodejs\node.exe" "%~dp0host.js"
