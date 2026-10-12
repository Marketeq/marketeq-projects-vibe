# Marketeq Time Tracker

Electron + React + TypeScript + SQLite desktop app for time tracking.
Phase 1 scaffold — compiles into unsigned installers.

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- macOS 12+ or Windows 10+
- Python 3 + a working C/C++ toolchain (for building `better-sqlite3`)

## Install

```bash
cd desktop
npm install
```

`postinstall` runs `electron-builder install-app-deps` which rebuilds native
modules (notably `better-sqlite3`) against the bundled Electron ABI.

If you switch Electron versions later, re-run:

```bash
npm run rebuild
```

## Dev

Two terminals:

```bash
# Terminal 1 — Vite dev server for the renderer
npm run dev:renderer

# Terminal 2 — Electron main + preload (builds once, then launches)
npm run build:main && npm run build:preload && \
  VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
```

> Phase 1 does not start a watch task. The dev loop will be tightened up in
> a later phase. The host machine has crashed from concurrent heavy Node
> processes — do not run long-lived watchers alongside Chrome DevTools.

## Type-check everything

```bash
npm run typecheck
```

## Build installers

```bash
npm run dist:mac    # -> dist/*.dmg and dist/*.zip
npm run dist:win    # -> dist/*.exe (NSIS) and portable
npm run dist        # both, whichever the host supports
```

Artifacts land in `desktop/dist/` alongside the compiled JS. Builds are
**unsigned** in Phase 1 — Apple Developer ID / Windows Authenticode signing
and notarization are wired up per doc 29 §1.1 in a later phase.

## Layout

```
desktop/
├── electron-builder.yml     # packaging config (app id, mac/win targets)
├── package.json
├── tsconfig.{json,main,preload,renderer}.json
├── vite.config.ts
├── resources/
│   ├── icon.png             # app icon, 1024px (icon.ico is generated from it)
│   ├── entitlements.mac.plist
│   └── installer.nsh        # NSIS custom install script
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   ├── logger.ts
│   │   ├── lifecycle/single-instance.ts
│   │   └── db/
│   │       ├── connection.ts
│   │       ├── migrate.ts
│   │       ├── schema.ts
│   │       ├── migrations/001_initial.sql
│   │       └── repos/…
│   ├── preload/index.ts
│   ├── renderer/            # React + Vite
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── shared/
│       ├── types.ts
│       ├── ipc-contracts.ts
│       └── constants.ts
└── dist/                    # build output — installers + compiled JS
```

See `/Users/christorres/Documents/Claude/Projects/Time Tracking/` (docs 09
and 11) for the authoritative spec.
