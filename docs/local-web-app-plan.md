# Local Web Control Center – Project Plan

## 1. Objectives
- Build a browser-based dashboard that controls and monitors up to 20 OBS Studio instances from any local machine.
- Provide immediate functionality for mission-critical operations (mute all, scene recall 1–5) and live telemetry (CPU, stream/record status, dropped frames, audio meters).
- Deliver a turnkey Node.js application with bundled frontend and backend, runnable via a single command (`npm start`).

## 2. Scope & Requirements
- **Functional**
  - Configure 20 OBS endpoints (IP/port/password) via UI form, persisted on server (JSON file) with optional encryption.
  - One-click actions: mute/unmute all, set scene 1–5 (configurable names), reconnect all.
  - Real-time per-instance dashboard including:
    - Connection status & last heartbeat
    - CPU usage (%)
    - Streaming state + dropped frames
    - Recording state + dropped frames
    - Audio VU meter (peak/RMS) for main audio bus
  - Support manual trigger per instance (mute/scene) in future iteration.
- **Non-Functional**
  - Works offline; no cloud dependencies.
  - Minimal latency (target <200ms reaction) with stable performance at 20 connections.
  - Frontend responsive for desktop displays; accessible via modern browsers (Chromium, Firefox, Edge).
  - Code modular to reuse core logic in other surfaces.

## 3. Architecture Overview
- **Backend (apps/server)**
  - Node.js 20 + TypeScript.
  - Express/Fastify REST endpoints for commands and settings.
  - Socket.IO (or WS+SSE) channel streaming telemetry updates to clients.
  - Shared core module `obsManager` reusing logic from existing plugin, parameterized for 20 connections.
  - Persist configuration in `%APPDATA%/MultiOBSWeb/config.json` (Windows) or `~/.config/multi-obs-web/` (macOS/Linux). Optionally encrypt passwords using AES with local key.
- **Frontend (apps/dashboard)**
  - Vite + React + TypeScript.
  - Component library: Chakra UI/Mantine for quick layout, theming, dark mode.
  - State management via React Query + Socket.IO client for live updates.
  - UI modules: global action bar, metrics grid (20 tiles), detail drawer, settings modal, activity log.
- **Shared Packages**
  - `packages/core`: OBS manager, types, utilities.
  - `packages/types`: Shared DTOs for REST/WebSocket contracts.
- **Deployment**
  - Single repo with npm workspaces. `npm run dev` launches both server & client (concurrently). `npm run build` builds frontend and serves static files from backend.
  - Dockerfile (optional) for containerized deployment.

## 4. Data Flow
1. **Startup**
   - Server loads configuration, establishes OBS connections asynchronously, starts emitting telemetry via Socket.IO.
   - Frontend loads, fetches configuration summary via REST, subscribes to telemetry channel.
2. **Telemetry Pipeline**
   - OBS events (stream/record state, health data) parsed by `obsManager`.
   - Manager aggregates metrics, normalizes data, emits `telemetry:update` events (~1 Hz; audio meters 10 Hz).
   - Socket.IO broadcasts to all connected clients; frontend updates UI reactively.
3. **Command Execution**
   - User triggers action (e.g., “Set Scene 3”) → frontend calls `POST /actions/set-scene` with target scene id.
   - Server fan-outs OBS RPCs concurrently, returns aggregated result (success list, failure list).
   - Frontend displays toast/log entry; telemetry updates reflect new state.
4. **Settings Management**
   - Settings modal collects IP/port/password for each OBS (with validation/test button).
   - On save, frontend sends `PUT /settings` to backend; backend persists and triggers targeted reconnects.

## 5. Component Breakdown & Tasks
| Component | Tasks |
|-----------|-------|
| Repo Setup | Create workspace structure (`apps/server`, `apps/dashboard`, `packages/core`). Configure TypeScript paths, lint, formatting. |
| obsManager Core | Port `sockets.ts` logic, expand to 20 connections, implement reconnect jitter, error reporting, telemetry aggregator (CPU, stream/record, audio). |
| Server API | Build Express/Fastify app, REST endpoints (`/settings`, `/actions`, `/health`), Socket.IO telemetry namespace, JSON persistence helpers, security (CORS, rate limit). |
| Frontend UI | Implement layout with Chakra/Mantine, action buttons, status grid, VU meter components (canvas or CSS), log panel, settings modal with validation. |
| Telemetry Client | Socket.IO client integration, hooks for state updates, resilience (auto-reconnect, stale data handling). |
| Testing & Tooling | Add unit tests (obsManager with mocked OBS), integration tests (supertest), frontend e2e smoke (Playwright). |
| Packaging & Deployment | Bundle frontend into server, create start scripts, systemd/Windows service instructions, optional Dockerfile. |
| Documentation | Quick start guide, OBS configuration checklist, troubleshooting, API references.

## 6. Milestones & Timeline (target rapid delivery ~3 days)
1. **M1 – Core Infrastructure (Day 1)**
   - Scaffold repo, build obsManager, implement settings storage.
   - Prototype server with telemetry broadcast (console logs).
2. **M2 – Functional Dashboard (Day 2)**
   - Develop frontend UI, integrate actions and telemetry.
   - Implement VU meters, status indicators, error handling.
   - End-to-end command execution working against test OBS instances.
3. **M3 – Polish & Deployment (Day 3)**
   - Add logging, configuration import/export, reconnect controls.
   - Finalize docs, run smoke tests, prepare release bundle.

## 7. Risks & Mitigations
- **OBS Event Coverage**: Some metrics (CPU usage) require polling `GetStats`. Mitigation: schedule periodic RPCs (e.g., every 2s) to supplement event stream.
- **Performance Bottlenecks**: 20 audio meters might overload browser. Mitigation: throttle volume updates, render simplified bar indicators.
- **Credential Handling**: Plain-text config is a risk. Mitigation: encrypt optional, restrict file permissions, highlight security guidance.
- **Time Constraint**: Need working tool within a day. Mitigation: prioritize MVP features (global buttons + metrics) before advanced UI polish.
- **Network Variability**: OBS servers may be remote with latency. Mitigation: async fan-out with per-host timeout and clear error messages.

## 8. Deliverables (MVP)
- Monorepo with backend/frontend/core packages.
- `npm run dev` (hot reload) and `npm start` (production) commands.
- Ready-to-use dashboard accessible at `http://localhost:3000` (configurable).
- Documentation: installation, configuration, usage walkthrough, known limitations, future roadmap (per-instance controls, authentication, remote access).
