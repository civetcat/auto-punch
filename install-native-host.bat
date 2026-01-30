@echo off
chcp 65001 >nul
echo ========================================
echo 註冊 Chrome Extension Native Host
echo ========================================
echo.

set HOST_PATH=%~dp0native-host\com.autopunch.host.json
set REG_KEY=HKCU\Software\Google\Chrome\NativeMessagingHosts\com.autopunch.host

echo 步驟 1：請先在 Chrome 載入 Extension
echo    - 開啟 chrome://extensions/
echo    - 開啟「開發人員模式」
echo    - 點擊「載入未封裝項目」
echo    - 選擇資料夾: %~dp0extension
echo.
echo 步驟 2：複製 Extension ID（在 Extension 卡片上可以看到）
echo.
set /p EXT_ID=請貼上 Extension ID（或按 Enter 跳過）: 

if not "%EXT_ID%"=="" (
    echo.
    echo 正在更新 Extension ID...
    powershell -Command "(Get-Content '%HOST_PATH%') -replace 'chrome-extension://\*/', 'chrome-extension://%EXT_ID%/' | Set-Content '%HOST_PATH%'"
    echo ✓ Extension ID 已更新
)

echo.
echo 正在註冊 Native Messaging Host...
echo Registry Key: %REG_KEY%
echo Host Path: %HOST_PATH%
echo.

reg add "%REG_KEY%" /ve /t REG_SZ /d "%HOST_PATH%" /f

if %errorlevel% equ 0 (
    echo.
    echo ✓ 註冊成功！
    echo.
    if "%EXT_ID%"=="" (
        echo ⚠ 注意：Extension ID 未設定，請手動編輯：
        echo    %HOST_PATH%
        echo    將 "chrome-extension://*/" 改為實際的 Extension ID
        echo.
    )
    echo 現在請：
    echo 1. 重新載入 Extension（點擊 Extension 卡片上的重新載入圖示）
    echo 2. 點擊 Extension 圖示測試
) else (
    echo.
    echo ✗ 註冊失敗
)

echo.
pause
