@echo off
chcp 65001 >nul
echo ========================================
echo 更新 Extension ID
echo ========================================
echo.
echo 請在 Chrome 中：
echo 1. 開啟 chrome://extensions/
echo 2. 找到「自動打卡控制」Extension
echo 3. 複製 Extension ID（在 Extension 卡片上可以看到）
echo.
set /p EXT_ID=請貼上 Extension ID: 

if "%EXT_ID%"=="" (
    echo.
    echo ✗ Extension ID 不能為空
    pause
    exit /b 1
)

set JSON_FILE=%~dp0native-host\com.autopunch.host.json

echo.
echo 正在更新 JSON 檔案...

powershell -Command "$json = Get-Content '%JSON_FILE%' | ConvertFrom-Json; $json.allowed_origins = @('chrome-extension://%EXT_ID%/'); $json | ConvertTo-Json -Depth 10 | Set-Content '%JSON_FILE%'"

if %errorlevel% equ 0 (
    echo.
    echo ✓ Extension ID 已更新為: %EXT_ID%
    echo.
    echo 現在請：
    echo 1. 在 Chrome 重新載入 Extension（點擊 Extension 卡片上的重新載入圖示）
    echo 2. 點擊 Extension 圖示測試
) else (
    echo.
    echo ✗ 更新失敗，請手動編輯 JSON 檔案
    echo   檔案位置: %JSON_FILE%
    echo   將 "chrome-extension://*/" 改為 "chrome-extension://%EXT_ID%/"
)

echo.
pause
