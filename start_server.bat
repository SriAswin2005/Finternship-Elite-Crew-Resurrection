@echo off
title Hotel Aditya Grand - AI Order Assistant
echo ============================================
echo  Hotel Aditya Grand - AI Order Assistant
echo  Starting backend server...
echo ============================================
echo.
cd /d %~dp0backend
py -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
