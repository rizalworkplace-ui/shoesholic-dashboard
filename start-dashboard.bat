@echo off
echo ================================
echo   Shoesiholic Dashboard Starter
echo ================================
echo.
echo [1/2] Starting server...
start "Shoesiholic Server" /B cmd /c "cd /d %~dp0 && node server.js"
timeout /t 3 /nobreak >nul
echo [2/2] Starting tunnel...
echo.
echo Dashboard: 
echo.
echo DO NOT CLOSE THIS WINDOW
echo Press Ctrl+C to stop
echo ================================
echo.
npx localtunnel --port 3000
pause
