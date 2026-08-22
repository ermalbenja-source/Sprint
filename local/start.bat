@echo off
REM ============================================================================
REM  SPRINT - Nis programin e dyqanit mbi kete kompjuter.
REM  Kliko dy here mbi kete skedar.
REM ============================================================================
title SPRINT - programi i dyqanit
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Nuk u gjet Node.js.
  echo   Shkarkoje nga https://nodejs.org  ^(versioni 22 ose me i ri^)
  echo   dhe pastaj hape serish kete skedar.
  echo.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo   Po pergatitet faqja...
  node build.js
)

echo.
node local\server.js
pause
