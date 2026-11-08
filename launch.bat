@echo off
cd /d "%~dp0"
title Open Generative AI

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js puuttuu. Asenna se osoitteesta https://nodejs.org
  pause
  exit /b 1
)

echo Kaynnistetaan web-sovellus: http://localhost:3000/studio/workflows
start "" cmd /c "timeout /t 8 /nobreak >nul & start "" http://localhost:3000/studio/workflows"
call npm run dev -- -p 3000
if errorlevel 1 pause
