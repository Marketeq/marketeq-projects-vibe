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
  ; Local ActivityWatch tracking data (see activitywatch-tracker.ts) is
  ; cleaned up on every stop(), but that only covers ending a session —
  ; nothing removes it if the app itself is uninstalled. Delete it here so
  ; no tracking data survives an uninstall. Scoped to just this folder, not
  ; the rest of $APPDATA\marketeq-time-tracker (timer/task history, settings).
  RMDir /r "$APPDATA\marketeq-time-tracker\dtt\activitywatch"
!macroend
