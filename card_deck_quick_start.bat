@echo off
title ArtCraft PhotoCraft - 10 Playing Card Decks Generator
echo =================================================================
echo   ArtCraft PhotoCraft - 10 Playing Card Decks Automation
echo =================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0generate_card_decks.ps1"
echo.
pause
