@echo off
chcp 65001 >nul
echo ========================================
echo 移除開機自動啟動
echo ========================================
echo.

schtasks /delete /tn "自動打卡系統" /f

if %errorlevel% equ 0 (
    echo ✓ 已成功移除自動啟動設定
) else (
    echo ✗ 找不到工作排程或移除失敗
)

echo.
pause
