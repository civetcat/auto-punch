@echo off
chcp 65001 >nul
title 自動打卡系統 - 一鍵安裝
cd /d "%~dp0"

echo.
echo ========================================
echo   自動打卡系統 - 一鍵安裝
echo ========================================
echo.

echo [1/4] 檢查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ 未安裝 Node.js
    echo 請先到 https://nodejs.org/ 下載安裝後再執行本安裝
    pause
    exit /b 1
)
echo ✓ Node.js: 
node --version
echo.

echo [2/4] 安裝相依套件...
call npm install
if %errorlevel% neq 0 (
    echo ✗ npm install 失敗
    pause
    exit /b 1
)
echo ✓ 相依套件安裝完成
echo.

echo [3/4] 安裝 Playwright 瀏覽器（Chromium）...
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo ✗ Playwright 安裝失敗
    pause
    exit /b 1
)
echo ✓ Playwright 安裝完成
echo.

echo [4/4] 註冊 Chrome Extension Native Host...
set HOST_PATH=%~dp0native-host\com.autopunch.host.json
set REG_KEY=HKCU\Software\Google\Chrome\NativeMessagingHosts\com.autopunch.host
reg add "%REG_KEY%" /ve /t REG_SZ /d "%HOST_PATH%" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Native Host 已註冊
) else (
    echo ⚠ Native Host 註冊失敗（不影響主程式，Extension 需手動執行 install-native-host.bat）
)
echo.

echo ========================================
echo   ✓ 安裝完成！
echo ========================================
echo.
echo 接下來請安裝 Chrome Extension：
echo.
echo   1. 即將開啟「Chrome 擴充功能」頁面與「extension」資料夾
echo   2. 在 Chrome 點擊「載入未封裝項目」
echo   3. 選擇已開啟的「extension」資料夾
echo   4. 安裝後若 Extension 無法連線，請執行 update-extension-id.bat 貼上 Extension ID
echo.
pause

:: 開啟 extension 資料夾
start "" "%~dp0extension"

:: 嘗試用 Chrome 開啟擴充功能頁面（若 Chrome 為預設或路徑存在）
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "chrome://extensions/"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "chrome://extensions/"
) else (
    echo 請手動開啟 Chrome，網址輸入: chrome://extensions/
    echo 開啟「開發人員模式」後點擊「載入未封裝項目」，選擇 extension 資料夾
)

echo.
echo 其他功能：
echo   - 開機自動啟動：執行 setup-startup-user.bat
echo   - 開關自動打卡：執行 toggle-auto-punch.bat 或使用 Extension
echo   - 測試流程：執行 dry-run.bat 或 Extension 內「測試流程（不打卡）」
echo.
pause
