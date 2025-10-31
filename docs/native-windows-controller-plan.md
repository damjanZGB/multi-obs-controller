# Native Windows Multi-OBS Controller – Project Plan

## 1. Objectives
- Deliver a Windows desktop application that controls and monitors up to 20 OBS Studio instances from a single UI.
- Provide essential broadcast controls (mute all, multi-scene switching) and real-time telemetry (CPU load, stream/record status, dropped frames, audio meters).
- Package as an installer (MSI/NSIS) with auto-update readiness and clear onboarding.

## 2. Scope & Requirements
- **Functional**
  - Configure up to 20 OBS WebSocket endpoints (IP, port, password) with persistent storage and quick profile switching.
  - One-click actions: mute/unmute all audio inputs, set scenes (preset buttons for scenes 1–5) across all selected instances.
  - Live dashboard showing per-instance metrics: CPU usage, stream status + dropped frames, record status + dropped frames, audio VU meters, connection health.
  - Manual override controls for individual instances (optional for v1.1).
- **Non-Functional**
  - Windows 10+ support, 64-bit.
  - Secure storage for passwords (Windows DPAPI or encrypted store).
  - Lightweight footprint (<150 MB installed), quick startup, smooth updates from telemetry (target refresh 5 Hz for VU meters, 1 Hz for other stats).
  - Modular architecture to share core logic with other surfaces (web app, Stream Dock).

## 3. Architecture Overview
- **Shell & UI**
  - Electron (Node.js + Chromium) or Tauri (Rust + WebView). Electron chosen for fastest reuse of existing TypeScript logic and ecosystem.
  - React + Typescript UI with component library (Fluent UI / Chakra) for layout, theming, and accessibility.
- **Process Structure**
  - Electron main process:
    - Hosts IPC API for renderer.
    - Runs shared `obsManager` service in Node context.
    - Handles secure credential persistence and auto-update hook.
  - Renderer process:
    - Presents dashboard, settings, notifications.
    - Subscribes to telemetry updates via IPC (using `contextBridge` + `ipcRenderer`).
- **Shared Core**
  - `obsManager` Node module: manages 20 OBS connections, command fan-out, telemetry aggregation.
  - `actionsService`: exposes `muteAll`, `setSceneAll`, etc., with structured responses (success, per-instance errors).
  - `telemetryCache`: central store for per-instance states, throttled broadcast to renderer.
- **Persistence**
  - Config data stored under `%APPDATA%/MultiOBSController/` as JSON; sensitive fields encrypted using DPAPI via `node-keytar`/`windows-credman`.
  - Backup/restore mechanisms (export/import JSON).
- **Packaging**
  - Build with `electron-builder` (target: NSIS installer), optional auto-update via GitHub releases or custom server.
  - Signed installer (future step) and portable build for testing.

## 4. Data Flow
1. **Startup**
   - Electron main loads configuration, decrypts credentials, initializes `obsManager`.
   - `obsManager` connects to each OBS WebSocket (async) and subscribes to telemetry events (`StreamStateChanged`, `InputVolumeMeters`, `HealthData`).
   - Renderer requests initial state via IPC; receives `state:update` events thereafter.
2. **User Actions**
   - Renderer triggers IPC commands (e.g., `actions:setScene`, payload {sceneName}).
   - Main relays to `actionsService`, which loops through connected sockets, issues OBS RPCs concurrently, returns aggregated result.
3. **Telemetry Updates**
   - `obsManager` normalizes OBS events into internal state (CPU%, dropped frames, statuses).
   - Emits updates through event emitter; main relays to renderer as throttled JSON payload.
4. **Settings Changes**
   - Renderer shows configuration dialogs; user saves.
   - Renderer sends `settings:update`; main validates, persists (encrypts), triggers targeted reconnect(s).

## 5. Component Breakdown & Tasks
| Component | Tasks |
|-----------|-------|
| Project Setup | Scaffold Electron + React app, configure TypeScript, ESLint, testing (Vitest/Playwright). |
| OBS Core Library | Extract logic from existing plugin, generalize to Node module, add connection pooling, error handling, telemetry aggregator, tests with mocked OBS. |
| IPC Layer | Define types/interfaces for commands and telemetry; secure context bridge; add backpressure handling. |
| UI Dashboard | Build layout: global controls bar, 20-instance grid, detail drawer, notifications/log panel. Implement VU meters (canvas/web audio). |
| Settings Module | Create settings wizard, profile management, encryption for passwords, validation (ping/test). |
| Logging & Diagnostics | Integrate structured logging (winston/pino), log viewer UI, crash reporting hook. |
| Packaging | Configure electron-builder targets, icons, versioning, auto-update scaffold. |
| QA & Docs | Manual test plan (multi OBS, network failures), integration tests with simulated servers, user guide, troubleshooting docs. |

## 6. Milestones & Timeline (estimate ~2 weeks)
1. **M1 – Core Infrastructure (4 days)**
   - Project scaffolding, obsManager extraction, mocked OBS integration tests.
   - Basic IPC set up, placeholder UI with real-time telemetry feed visible in console.
2. **M2 – Feature Completion (5 days)**
   - Implement dashboard UI, VU meters, control bar.
   - Settings management with persistence & encryption.
   - Command execution (mute/scene) with success/error reporting.
3. **M3 – Hardening & Packaging (3 days)**
   - Polish UX, add logs/diagnostics, handle reconnection scenarios.
   - Prepare installer, smoke test on clean machines, finalize documentation.

## 7. Risks & Mitigations
- **Time Constraint**: Building full Electron app may exceed short-term deadline. Mitigation: parallel development with web app; reuse UI components.
- **Telemetry Load**: Audio meters at 20× high refresh might stress IPC/rendering. Mitigation: downsample data, use Web Workers/canvas efficiently.
- **Credential Security**: Handling passwords incorrectly introduces risk. Mitigation: use proven libraries (`keytar`), keep secrets in main process only.
- **OBS Version Compatibility**: Variation in OBS WebSocket versions. Mitigation: rely on v5 API, provide compatibility layer or version checks.
- **Auto-Update Complexity**: Could delay release. Mitigation: deliver manual installer first; plan auto-update as phase 2.

## 8. Deliverables
- Electron application source with shared core library.
- Build artifacts: installer, portable zip, release notes.
- Documentation: setup guide, OBS configuration checklist, troubleshooting, test matrix.
- Future roadmap: integration with Stream Dock, plugin bridging, advanced per-instance controls.
