# Multi OBS Control Center — Project Guide

## Overview
This repository now hosts a browser-based control center that can manage up to twenty OBS Studio instances simultaneously. The solution consists of a Node.js backend (REST + Socket.IO) and a React dashboard that provides global controls, per-instance telemetry, and configuration management.

Key capabilities:
- Configure and persist up to 20 OBS WebSocket endpoints (IP, port, password, alias, enabled flag).
- One-click global actions for mute/unmute and scene recall (scenes 1–5 by default).
- Live telemetry for CPU usage, stream/record states, dropped frames, and audio level meters per OBS instance.
- Socket-powered updates with reconnect logic and persistent storage (`configstore` in the user profile).

## Repository Layout
```
docs/PROJECT_GUIDE.md        ← this guide
docs/*.md                    ← planning artifacts
scripts/control-center-server← Node.js backend (Express + Socket.IO)
scripts/shared               ← Shared TypeScript types
ui/control-center            ← React dashboard (Vite + Chakra UI)
```

## Prerequisites
- Node.js 20 or later (tested with v20.x)
- npm or pnpm (examples below use npm)
- OBS Studio instances running WebSocket server v5+ (default port 4455)

## Quick Start (Development)
1. **Install dependencies**
   ```bash
   cd scripts/control-center-server
   npm install

   cd ../../ui/control-center
   npm install
   ```

2. **Run the backend**
   ```bash
   cd scripts/control-center-server
   npm run dev
   ```
   The server listens on `http://localhost:4000` by default and exposes REST + Socket.IO endpoints.

3. **Run the frontend**
   ```bash
   cd ui/control-center
   npm run dev
   ```
   Vite serves the dashboard at `http://localhost:5173` and proxies `/api` + Socket.IO traffic to the backend.

4. **Configure OBS endpoints**
   - Open the dashboard, click **Settings**, and fill in the host/port/password for each OBS instance you want to manage.
   - Toggle **Enabled** for each active endpoint and save. The backend auto-reconnects and starts streaming telemetry.

## Production Build
1. Build the frontend bundle:
   ```bash
   cd ui/control-center
   npm run build
   # Output: ui/control-center/dist
   ```

2. Build the backend:
   ```bash
   cd scripts/control-center-server
   npm run build
   # Output: scripts/control-center-server/dist
   ```

3. Serve the dashboard from the backend:
   ```bash
   cd scripts/control-center-server
   STATIC_ROOT=../../ui/control-center/dist npm start
   ```
   Alternatively, copy the frontend `dist` contents next to the backend bundle and point `STATIC_ROOT` accordingly.

## Backend Notes
- Settings are stored via [`configstore`](https://github.com/yeoman/configstore) under the key `multi-obs-control-center`; location varies by OS (`%APPDATA%`, `~/.config`, etc.).
- Telemetry fan-out:
  - Stream status via OBS `StreamStateChanged`/`StreamStatus`
  - Record status via `RecordStateChanged`/`RecordStatus`
  - CPU usage from periodic `GetStats` requests
  - Audio meters from `InputVolumeMeters` subscription (maximum decibel level per update)
- Global actions use:
  - `SetCurrentProgramScene` for scene recall
  - `SetInputMute` on detected audio sources for mute/unmute

## Frontend Notes
- UI stack: Vite, React, Chakra UI.
- `ControlBar` exposes global buttons; telemetry grid auto-refreshes on socket events.
- Settings drawer edits all OBS endpoints in a single table; aliases appear on telemetry cards.
- Color mode toggle (light/dark) is available in the control bar.

## Testing & Validation
- **Backend linting**: `cd scripts/control-center-server && npm run lint`
- **Frontend linting**: `cd ui/control-center && npm run lint`
- Manual smoke testing recommendations:
  1. Start 2–3 OBS instances with WebSocket enabled (v5).
  2. Configure connections in the dashboard.
  3. Verify telemetry updates when starting/stopping streams/recordings.
  4. Trigger global mute/unmute and scene switching; confirm in OBS.
  5. Disconnect an OBS instance to confirm reconnect logic and offline state.

## Roadmap / TODO
- Allow custom scene presets (user-defined names instead of fixed 1–5).
- Surface per-instance command controls (scene, mute) alongside global actions.
- Encrypt stored passwords (e.g., Windows DPAPI integration).
- Add integration tests with mocked OBS servers.
- Bundle combined dev runner script for simultaneous backend/frontend startup.
