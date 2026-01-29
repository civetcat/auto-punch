@echo off
chcp 65001 >nul
echo ========================================
echo 設定開機自動啟動（一般使用者）
echo ========================================
echo.

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\自動打卡.lnk
set VBS_PATH=%CD%\start-hidden.vbs

echo 正在建立捷徑到啟動資料夾...
echo.

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = '%CD%'; $s.WindowStyle = 1; $s.Description = '自動打卡系統'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo ✓ 設定成功！
    echo.
    echo 捷徑已建立在: %STARTUP_FOLDER%
    echo.
    echo 系統將在每次開機後自動啟動（背景執行）
    echo 每天 17:00 會自動讀取當天下班時間並打卡
    echo.
    echo 如要停用，刪除該捷徑或執行 remove-startup-user.bat
) else (
    echo ✗ 設定失敗
)

echo.
pause
