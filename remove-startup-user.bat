@echo off
chcp 65001 >nul
echo ========================================
echo 移除開機自動啟動
echo ========================================
echo.

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\自動打卡.lnk

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo ✓ 已成功移除自動啟動設定
) else (
    echo ✗ 找不到捷徑檔案
)

echo.
pause
