@echo off
chcp 65001 >nul
echo ========================================
echo 自動打卡系統 - 測試模式
echo ========================================
echo.
echo 將立即嘗試打卡（不等待下班時間）
echo.
pause

call npm run test

echo.
pause
