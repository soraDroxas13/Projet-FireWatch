@echo off
:: Relancer en administrateur automatiquement
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Elevation des privileges necessaire...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)
call "%~dp0demarrer-firewatch.bat"