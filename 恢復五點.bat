@echo off
cd /d "%~dp0"
if exist skip-5pm.txt del skip-5pm.txt
echo 已恢復五點自動觸發
pause
