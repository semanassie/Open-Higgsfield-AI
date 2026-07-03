@echo off
setlocal
cd /d "%~dp0"
title Open Higgsfield AI

set "PORT=3006"
set "APP_URL=http://localhost:%PORT%"
set "LOG_FILE=%~dp0logs\launch.log"
set "PS1_DIR=%~dp0scripts"

if not exist "%~dp0logs" mkdir "%~dp0logs" >nul 2>&1

REM Already running? Open browser and exit.
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_DIR%\is-port-open.ps1" -Port %PORT% >nul 2>&1
if %errorlevel% equ 0 (
    start "" "%APP_URL%"
    exit /b 0
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    msg * "Open Higgsfield AI: Node.js puuttuu. Asenna https://nodejs.org"
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...>> "%LOG_FILE%"
    call npm install >> "%LOG_FILE%" 2>&1
    if %errorlevel% neq 0 (
        msg * "Open Higgsfield AI: npm install epaonnistui. Katso logs\launch.log"
        exit /b 1
    )
)

echo [%date% %time%] Starting on %APP_URL%>> "%LOG_FILE%"

REM Open browser when server responds (background, separate script = no quoting issues)
start /min powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1_DIR%\wait-and-open-browser.ps1" -Url "%APP_URL%"

call npx vite --port %PORT% --strictPort >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% neq 0 (
    echo [%date% %time%] Stopped with error %EXIT_CODE%>> "%LOG_FILE%"
    msg * "Open Higgsfield AI pysähtyi virheeseen. Katso logs\launch.log"
)

exit /b %EXIT_CODE%
