@echo off
title FireWatch — Démarrage automatique
color 0A

echo ================================================
echo    FIREWATCH - Systeme de Detection Incendie
echo ================================================
echo.

:: ── 1. Démarrer Mosquitto ──
echo [1/3] Demarrage de Mosquitto (broker MQTT)...
net start mosquitto >nul 2>&1
if %errorlevel% == 0 (
    echo        Mosquitto demarre avec succes !
) else (
    echo        Mosquitto etait deja en cours...
)
timeout /t 2 /nobreak >nul

:: ── 2. Démarrer Node-RED ──
echo [2/3] Demarrage de Node-RED...
start "Node-RED" cmd /k "node-red"
timeout /t 4 /nobreak >nul
echo        Node-RED demarre ! (http://localhost:1880)

:: ── 3. Démarrer Angular ──
echo [3/3] Demarrage de Angular...
start "Angular - FireWatch" cmd /k "cd /d %~dp0 && ng serve --open"
timeout /t 5 /nobreak >nul
echo        Angular demarre ! (http://localhost:4200)

echo.
echo ================================================
echo    Tous les services sont lances !
echo    - Mosquitto  : port 1883 (MQTT) + 9001 (WS)
echo    - Node-RED   : http://localhost:1880
echo    - Angular    : http://localhost:4200
echo ================================================
echo.
echo Appuyez sur une touche pour ouvrir le dashboard...
pause >nul

:: ── Ouvrir le dashboard dans le navigateur ──
start "" "http://localhost:4200/residents"

exit