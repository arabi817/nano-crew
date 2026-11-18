@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo  Nano Crew test server: http://localhost:8780
echo  Close this window to stop the server.
echo.
start "" "http://localhost:8780/host.html"
python tools\devserver.py 8780 .
pause
