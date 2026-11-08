@echo off
cd /d "%~dp0"
title Open Generative AI

REM This checkout only:
REM   C:\Projects\Open-Higgsfield-AI\open-higgsfield-ai\launch.bat
REM Starts the Next studio on port 3010 and the localhost Vork bridge on 3011.
REM Port 3000 belongs to OpenClaw. Do not use it.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js puuttuu. Asenna se osoitteesta https://nodejs.org
  pause
  exit /b 1
)

echo Kaynnistetaan Vork-silta osoitteessa http://127.0.0.1:3011
start "Vork bridge" /MIN node scripts\vork-bridge.js

echo Kaynnistetaan web-studio osoitteessa http://localhost:3010/studio
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3010/studio"

call npm run dev -- -p 3010
if errorlevel 1 pause
