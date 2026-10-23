@echo off
echo Starting local web server for music demo...
echo.
echo Open your browser to: http://localhost:8000/src/audio/music_demo.html
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
python -m http.server 8000
