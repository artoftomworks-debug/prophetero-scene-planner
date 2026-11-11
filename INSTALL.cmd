@echo off
setlocal
echo Prophetero Scene Planner - H3 Public Beta
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-ScenePlanner.ps1"
if errorlevel 1 echo Installation did not finish. Read the message above.
pause
