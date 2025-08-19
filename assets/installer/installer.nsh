!macro customInstall
  ; Try PowerShell script first to gracefully close Allen Console
  nsExec::ExecToStack 'powershell.exe -ExecutionPolicy Bypass -File "$TEMP\close-app.ps1"'
  Pop $0
  If $0 != "0"
    ; If PowerShell fails, try batch file
    nsExec::ExecToStack 'cmd.exe /c "$TEMP\close-app.bat"'
  EndIf
  
  ; Wait for processes to close
  Sleep 3000
  
  ; Final fallback: Kill any remaining processes
  nsExec::ExecToStack 'taskkill /f /im "Allen Console.exe"'
  nsExec::ExecToStack 'taskkill /f /im "allen-ui-console-electron.exe"'
  
  Sleep 2000
!macroend

!macro customUnInstall
  ; Try PowerShell script first to gracefully close Allen Console
  nsExec::ExecToStack 'powershell.exe -ExecutionPolicy Bypass -File "$TEMP\close-app.ps1"'
  Pop $0
  If $0 != "0"
    ; If PowerShell fails, try batch file
    nsExec::ExecToStack 'cmd.exe /c "$TEMP\close-app.bat"'
  EndIf
  
  ; Wait for processes to close
  Sleep 3000
  
  ; Final fallback: Kill any remaining processes
  nsExec::ExecToStack 'taskkill /f /im "Allen Console.exe"'
  nsExec::ExecToStack 'taskkill /f /im "allen-ui-console-electron.exe"'
  
  Sleep 2000
!macroend

; Function to check if application is running
Function CheckAppRunning
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq Allen Console.exe"'
  Pop $0
  Pop $1
  If $1 != ""
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Allen Console is currently running. Please close it and click OK to continue, or Cancel to abort the installation." IDOK continueInstall IDCANCEL abortInstall
    continueInstall:
      nsExec::ExecToStack 'taskkill /f /im "Allen Console.exe"'
      Sleep 2000
      Goto done
    abortInstall:
      Abort "Installation cancelled by user."
  EndIf
  done:
FunctionEnd

; Copy scripts to temp directory
Function CopyScripts
  SetOutPath "$TEMP"
  File "assets\installer\close-app.ps1"
  File "assets\installer\close-app.bat"
FunctionEnd

; Call the function before installation
Function .onInit
  Call CopyScripts
  Call CheckAppRunning
FunctionEnd
