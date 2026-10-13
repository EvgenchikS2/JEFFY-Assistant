@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Установите Node.js 22 или новее: https://nodejs.org/
  pause
  exit /b 1
)
start "" "http://127.0.0.1:47831"
node src/server.mjs
pause
