@echo off
setlocal
cd /d "%~dp0"
set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if not exist "%BUN%" set "BUN=bun"
if not exist "node_modules\electron\dist\electron.exe" (
  call "%BUN%" install --frozen-lockfile
  if errorlevel 1 (
    echo L'installation a echoue. Regarde le message d'erreur au-dessus.
    pause
    exit /b 1
  )
)
call "%BUN%" run start
pause
