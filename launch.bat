@echo off
cd /d "%~dp0"
title Open Generative AI

REM Desktop app for THIS checkout only:
REM   C:\Projects\Open-Higgsfield-AI\open-higgsfield-ai\launch.bat
REM Double-click this file. It rebuilds the Electron UI from this folder
REM and opens the Open Generative AI window on Workflows (file dist/index.html#workflows).
REM Do not open http://localhost:3000 — that port is OpenClaw's Express server
REM (C:\Projects\OpenClaw\chat-ui\server.js), which answers "Cannot GET /studio/workflows".
REM This studio does not use port 3000. Next.js /studio/workflows is the hosted web app.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js puuttuu. Asenna se osoitteesta https://nodejs.org
  pause
  exit /b 1
)

echo Kaynnistetaan tyopoytasovellus tasta kansiosta (Electron).
echo Ikkuna: Open Generative AI — Workflows
call npm run electron:dev
if errorlevel 1 pause
