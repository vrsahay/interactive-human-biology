@echo off
rem Serves this folder locally and opens the lesson in the default browser.
cd /d "%~dp0"
set PORT=8000
echo Human Respiratory System lesson - http://localhost:%PORT%/respiratory_system.html
echo Keep this window open while using the lesson. Close it to stop.
where node >nul 2>nul
if errorlevel 1 goto python

node scripts\build-config.js
start "" "http://localhost:%PORT%/respiratory_system.html"
node scripts\serve.js %PORT%
goto end

:python
start "" "http://localhost:%PORT%/respiratory_system.html"
where py >nul 2>nul && (py -m http.server %PORT%) || (python -m http.server %PORT%)

:end
pause
