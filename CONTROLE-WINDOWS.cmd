@echo off
cd /d "%~dp0"
set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if not exist "%BUN%" set "BUN=bun"
"%BUN%" .\check-windows.cjs
pause
