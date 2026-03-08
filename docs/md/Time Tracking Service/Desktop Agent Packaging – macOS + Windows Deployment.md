**Desktop Agent Packaging -- macOS + Windows Deployment**

This document outlines the full packaging and installation plan for the
ActivityWatch-based desktop agent. The goal is to provide a secure,
auto-starting background app that captures activity
(keyboard/mouse/screenshot) and syncs it to the cloud using the NestJS
backend and Cloudflare R2.

1.  Packaging Options

- macOS:

  - Format: .pkg installer or signed .app bundle

  - Tools: create-dmg, pkgbuild, or Electron auto-packager

- Windows:

  - Format: .exe or .msi installer

  - Tools: Electron-builder with NSIS or Squirrel

- Cross-platform alternative:

  - Use Electron with custom background services

  - Precompiled Python binary using PyInstaller (for non-GUI tools)

2.  Preconfigured Build Behavior

Each build will be generated with the following embedded:

- Predefined userId (JWT token optional)

- Render endpoint base URL

- R2 bucket + folder path (optional)

- Screenshot interval in seconds

This avoids user login or config entry at runtime. Agent is scoped per
user.

3.  Auto-run on Boot

- macOS:

  - Register LaunchAgent plist in \~/Library/LaunchAgents

  - Path: com.company.awagent.plist

- Windows:

  - Registry key under
    HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run

  - Key: AWAgent → Path to executable

Agent starts silently on reboot without UI.

4.  Files and Directories

- Screenshot temp cache:

  - macOS: \~/Library/Application Support/AWAgent/screenshots/

  - Windows: %APPDATA%\\AWAgent\\screenshots\\

- Log file (for debugging):

  - awagent.log in the same path above

5.  Installation Flow (User Side)

6.  Download .pkg or .exe installer from dashboard

7.  Install silently or with minimal confirmation

8.  Auto-starts on next boot

9.  First run begins screenshot + activity tracking immediately

10. Upload queue runs in background

<!-- -->

6.  Uninstall Process

- macOS:

  - Remove .app or LaunchAgent plist manually

  - Optional: provide uninstall.sh

- Windows:

  - Add uninstall entry in Control Panel

  - Remove registry auto-start entry

7.  Security Measures

- No UI visible to users (optional tray icon in future)

- Screenshots stored only temporarily before upload

- Local encryption of temp files (optional)

- UUID-generated filenames to prevent collision

- Signed binaries (code signing certs required)

8.  Future Enhancements

- Login/auth UI for multi-user mode

- OS notifications on failure

- Auto-update logic

- Tray menu for pause/exit/debug
