; resources/installer.nsh
; Custom NSIS installer script — copied from doc 29 §1.3.
!include "x64.nsh"

!macro customInstall
  ; Associate .dtt file type
  WriteRegStr HKCU "Software\Classes\.dtt" "" "DTTFile"
  WriteRegStr HKCU "Software\Classes\DTTFile" "" "Marketeq Time Tracker Project"
  WriteRegStr HKCU "Software\Classes\DTTFile\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\DTTFile"
  DeleteRegKey HKCU "Software\Classes\.dtt"
!macroend
