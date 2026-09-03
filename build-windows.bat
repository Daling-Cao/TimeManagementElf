@echo off
setlocal
pushd "%~dp0frontend"

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js / npm was not found. Install Node.js LTS first.
  popd
  exit /b 1
)

echo [1/2] Installing/updating dependencies...
call npm install
if errorlevel 1 goto :failed

echo [2/2] Building the portable Windows app...
call npm run dist:win
if errorlevel 1 goto :failed

echo.
echo Build complete: frontend\release\TimeManagementElf.exe
popd
exit /b 0

:failed
echo.
echo [ERROR] Build failed. Review the output above.
popd
exit /b 1
