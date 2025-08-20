!macro customInstall
  ; Check if application is running and prompt user
  Call CheckAppRunning
  
  ; Kill any running instances of Astra
  nsExec::ExecToStack 'taskkill /f /im "Astra.exe"'
  nsExec::ExecToStack 'taskkill /f /im "astra-electron.exe"'
  
  ; Wait for processes to close
  Sleep 2000
!macroend

!macro customUnInstall
  ; Kill any running instances of Astra
  nsExec::ExecToStack 'taskkill /f /im "Astra.exe"'
  nsExec::ExecToStack 'taskkill /f /im "astra-electron.exe"'
  
  ; Wait for processes to close
  Sleep 2000
!macroend

; Function to check if application is running
Function CheckAppRunning
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq Astra.exe"'
  Pop $0
  Pop $1
  StrCmp $1 "" done
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Astra is currently running. Please close it and click OK to continue, or Cancel to abort the installation." IDOK continueInstall IDCANCEL abortInstall
  continueInstall:
    nsExec::ExecToStack 'taskkill /f /im "Astra.exe"'
    Sleep 2000
    Goto done
  abortInstall:
    Abort "Installation cancelled by user."
  done:
FunctionEnd
