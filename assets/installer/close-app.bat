@echo off
echo Attempting to close Allen Console...

REM Try to close gracefully first
taskkill /f /im "Allen Console.exe" 2>nul
taskkill /f /im "allen-ui-console-electron.exe" 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Force kill any remaining processes
wmic process where "name like '%%Allen Console%%'" call terminate 2>nul
wmic process where "name like '%%allen-ui-console%%'" call terminate 2>nul

REM Additional cleanup
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq Allen Console.exe" /fo table /nh 2^>nul') do (
    if not "%%i"=="PID" (
        taskkill /f /pid %%i 2>nul
    )
)

echo Application closure completed.
