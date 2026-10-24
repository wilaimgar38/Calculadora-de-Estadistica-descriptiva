@echo off
title Calculadora de Estadistica y Probabilidad
cd /d "%~dp0"

start "Backend - Node.js" cmd /k "cd server && npm run dev"
timeout /t 2 /nobreak >nul
start "Frontend - React" cmd /k "cd client && npm run dev"

timeout /t 4 /nobreak >nul
start http://localhost:5173
