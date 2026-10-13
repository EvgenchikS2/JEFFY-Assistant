@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>&1
if errorlevel 1 (
  echo Установите Python 3.10 или новее: https://python.org/downloads/
  pause
  exit /b 1
)
python scripts\install_offline.py
if errorlevel 1 (
  echo Установка не завершена. Проверьте интернет и повторите запуск.
)
pause
