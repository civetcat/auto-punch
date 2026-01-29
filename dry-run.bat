@echo off
chcp 65001 >nul
echo ========================================
echo 自動打卡系統 - Dry-Run 模式
echo ========================================
echo.
echo 此模式會測試整個流程（包括 OCR 識別驗證碼）
echo 但 **不會** 真的送出打卡！
echo.
pause

call npm run dry-run

echo.
pause
