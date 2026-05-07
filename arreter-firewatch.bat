@echo off
title FireWatch — Arret des services
color 0C

echo Arret de tous les services FireWatch...
echo.

echo [1/3] Arret de Angular...
taskkill /F /FI "WINDOWTITLE eq Angular - FireWatch*" >nul 2>&1
echo        OK

echo [2/3] Arret de Node-RED...
taskkill /F /FI "WINDOWTITLE eq Node-RED*" >nul 2>&1
echo        OK

echo [3/3] Arret de Mosquitto...
net stop mosquitto >nul 2>&1
echo        OK

echo.
echo Tous les services sont arretes.
pause