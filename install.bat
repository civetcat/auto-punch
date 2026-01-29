@echo off
chcp 65001 >nul
echo ========================================
echo 自動打卡系統 - 安裝腳本
echo ========================================
echo.

echo [1/2] 檢查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ 未安裝 Node.js
    echo 請先到 https://nodejs.org/ 下載安裝
    pause
    exit /b 1
)
node --version
echo.

echo [2/2] 安裝相依套件...
call npm install
if %errorlevel% neq 0 (
    echo ✗ npm install 失敗
    pause
    exit /b 1
)
echo.

echo 安裝 Playwright 瀏覽器...
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo ✗ Playwright 安裝失敗
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✓ 安裝完成！
echo ========================================
echo.
echo 使用方式:
echo   測試: npm run test
echo   執行: npm run punch
echo   排程: node scheduler.js
echo.
pause
