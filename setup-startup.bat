@echo off
chcp 65001 >nul
echo ========================================
echo 設定開機自動啟動
echo ========================================
echo.
echo 正在建立工作排程...
echo.

schtasks /create /tn "自動打卡系統" /tr "\"%CD%\start-hidden.vbs\"" /sc onstart /ru "%USERNAME%" /rl highest /f

if %errorlevel% equ 0 (
    echo ✓ 設定成功！
    echo.
    echo 系統將在每次開機後自動啟動，並在背景執行
    echo 每天 17:00 會自動讀取當天下班時間並打卡
    echo.
    echo 如要停用，執行: schtasks /delete /tn "自動打卡系統" /f
) else (
    echo ✗ 設定失敗，請以系統管理員身分執行此檔案
)

echo.
pause
