@echo off
REM Multi-Voice Audio Generator - Quick Start Script
REM Victorian Christmas Solitaire

echo.
echo ================================================================
echo   Multi-Voice Audio Generator
echo   Victorian Christmas Solitaire
echo ================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/4] Checking Python installation... OK
echo.

REM Check if dependencies are installed
echo [2/4] Checking dependencies...
python -c "import pyttsx3" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing pyttsx3...
    pip install pyttsx3
)

python -c "import pydub" >nul 2>&1
if %errorlevel% neq 0 (
    echo pydub not installed (optional - for voice effects)
    echo Install with: pip install pydub
    echo.
)

echo Dependencies checked
echo.

REM Check if quotes file exists
echo [3/4] Checking quotes file...
if not exist "encouragement_quotes.json" (
    echo.
    echo WARNING: encouragement_quotes.json not found!
    echo.
    echo Please create this file from the template:
    echo   1. Copy encouragement_quotes_template.json
    echo   2. Rename to encouragement_quotes.json
    echo   3. Add your 30 encouragement quotes
    echo.
    echo Would you like to copy the template now? (Y/N)
    set /p CREATE_TEMPLATE=
    if /i "%CREATE_TEMPLATE%"=="Y" (
        copy encouragement_quotes_template.json encouragement_quotes.json
        echo Template copied! Please edit encouragement_quotes.json and run again.
        pause
        exit /b 0
    ) else (
        echo.
        echo Exiting. Please create encouragement_quotes.json and run again.
        pause
        exit /b 1
    )
)

echo Quotes file found: encouragement_quotes.json
echo.

REM Run the generator
echo [4/4] Generating audio files...
echo.
python generate_multi_voice_audio.py

REM Check if generation succeeded
if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   SUCCESS! Audio files generated
    echo ================================================================
    echo.
    echo Audio files saved to: audio\encouragement\
    echo.
    echo Next steps:
    echo   1. Review audio files in encouragement\ subdirectories
    echo   2. Test audio playback
    echo   3. Integrate with game
    echo.
) else (
    echo.
    echo ================================================================
    echo   ERROR: Audio generation failed
    echo ================================================================
    echo.
    echo Please check the error messages above and try again.
    echo.
)

pause
