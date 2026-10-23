@echo off
title PeerRacer Arcade
echo ================================================
echo Starting PeerRacer Arcade Local Server...
echo Opening in your default web browser...
echo ================================================
start "" "http://localhost:3000"
node server.js
pause
