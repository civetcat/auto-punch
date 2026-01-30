@echo off
chcp 65001 >nul
echo ========================================
echo 檢查 Native Host 設定
echo ========================================
echo.

set HOST_PATH=%~dp0native-host\com.autopunch.host.json
set REG_KEY=HKCU\Software\Google\Chrome\NativeMessagingHosts\com.autopunch.host

echo [1] 檢查 Registry...
reg query "%REG_KEY%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Registry 已註冊
    reg query "%REG_KEY%" /ve
) else (
    echo ✗ Registry 未註冊
    echo   請執行 install-native-host.bat
)

echo.
echo [2] 檢查 JSON 檔案...
if exist "%HOST_PATH%" (
    echo ✓ JSON 檔案存在
    echo   路徑: %HOST_PATH%
) else (
    echo ✗ JSON 檔案不存在
)

echo.
echo [3] 檢查 host.bat...
set HOST_BAT=%~dp0native-host\host.bat
if exist "%HOST_BAT%" (
    echo ✓ host.bat 存在
) else (
    echo ✗ host.bat 不存在
)

echo.
echo [4] 檢查 host.js...
set HOST_JS=%~dp0native-host\host.js
if exist "%HOST_JS%" (
    echo ✓ host.js 存在
) else (
    echo ✗ host.js 不存在
)

echo.
echo [5] 檢查 Node.js...
if exist "C:\Program Files\nodejs\node.exe" (
    echo ✓ Node.js 已安裝
) else (
    echo ✗ Node.js 未找到
    echo   請確認 Node.js 安裝在 C:\Program Files\nodejs\
)

echo.
echo ========================================
echo 如果所有項目都是 ✓，請：
echo 1. 在 Chrome 重新載入 Extension
echo 2. 確認 Extension ID 已正確設定在 JSON 中
echo ========================================
echo.
pause
