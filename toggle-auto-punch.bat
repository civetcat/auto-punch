@echo off
chcp 65001 >nul
cd /d "%~dp0"

set SKIP_FILE=skip-punch.txt

if exist "%SKIP_FILE%" (
    del "%SKIP_FILE%"
    echo.
    echo ========================================
    echo   自動打卡：已開啟
    echo ========================================
    echo.
    echo 下次排程觸發時將正常執行打卡
) else (
    echo skip > "%SKIP_FILE%"
    echo.
    echo ========================================
    echo   自動打卡：已關閉
    echo ========================================
    echo.
    echo 排程觸發時將跳過打卡（直到再次執行此檔案開啟）
)

echo.
pause
