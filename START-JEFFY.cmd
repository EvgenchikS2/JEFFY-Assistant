@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Установите Node.js 22 или новее: https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Первый запуск: устанавливаю зависимости Jeffy Assistant...
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 (
    echo Не удалось установить зависимости. Проверьте интернет.
    pause
    exit /b 1
  )
)
call npm.cmd start
if errorlevel 1 pause
