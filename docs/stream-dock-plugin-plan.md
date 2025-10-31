# Stream Dock Plugin Port – Multi OBS Controller (20 Connections)

## 1. Objectives
- Port existing Stream Deck Multi OBS Controller to the Stream Dock SDK (target device: MBox 293N3).
- Expand OBS WebSocket handling from 2 to 20 concurrent instances with reliable status sync.
- Deliver installable `.sdPlugin` package compatible with official Stream Dock Marketplace tooling.

## 2. Requirements & Scope
- **Functional**
  - Mirror core Stream Deck actions (stream, record, scene, mute, etc.) with fan-out to configurable target OBS instances.
  - Allow per-action targeting (single/all/custom subset) and state feedback for each socket.
  - Provide property inspector UI for configuring 20 OBS endpoints plus global plugin defaults.
  - Support reconnect logic and diagnostics within Stream Dock host (logs, debug toggle).
- **Non-Functional**
  - Maintain responsiveness with 20 simultaneous websocket connections (target <200ms action dispatch).
  - Resilient to partial outages—unreachable OBS instances must not block others.
  - Codebase organized for future reuse (shared core between Stream Deck and Stream Dock builds).

## 3. Architecture Overview
- **Plugin Runtime**
  - Entry executable (`plugin/app.exe`) built from TypeScript/Node bundle via `pkg`/`nexe`.
  - Bootstraps Stream Dock SDK `Plugins`/`Actions` helper, mapping Stream Dock events to internal action manager.
- **Core Modules**
  - `obsManager`: manages array of 20 `OBSWebSocket` clients, reconnection strategy, telemetry subscriptions.
  - `actionFramework`: adapts existing `AbstractBaseWsAction` patterns to Stream Dock event model.
  - `settingsStore`: persists global/action settings via Stream Dock storage APIs; handles migration from 2→20 sockets.
- **Property Inspector**
  - Web assets served by Stream Dock host; new layout with paginated/accordion configuration for 20 instances, default-target controls, color customization.
- **Packaging**
  - Folder structure aligned with Stream Dock sample (`manifest.json`, `plugin`, `propertyInspector`, `static`).
  - Asset conversion scripts for icons (PNG/JP(E)G as required by Stream Dock).

## 4. Data Flows
1. **Initialization**
   - Plugin process connects to Stream Dock WebSocket (`ws://127.0.0.1:<port>`); sends `register` payload.
   - Loads persisted global settings; seeds `obsManager` with connection endpoints; attempts asynchronous connect.
2. **Action Handling**
   - On `keyDown`/`keyUp`, route to action handler; determine targets via settings; fan-out OBS RPC requests.
   - Receive OBS events (e.g., `StreamStateChanged`, `RecordStateChanged`) and update Stream Dock key states via `setState`, `setTitle`, `setImage`.
3. **Settings Updates**
   - Property Inspector emits `sendToPlugin` with form data; plugin validates, updates Store, triggers targeted reconnect.
4. **Diagnostics**
   - Log events (connect/disconnect, errors) to file using `log4js` as per SDK sample; optionally echo via `logMessage`.

## 5. Key Components & Tasks
| Component | Tasks |
|-----------|-------|
| SDK Adapter | Build wrapper translating Stream Deck `$SD` API usage to Stream Dock `Plugins/Actions`. Replace event hooks and payload schemas. |
| OBS Manager | Refactor `src/plugin/sockets.ts` to parameterize number of sockets, add jittered reconnect loops, per-socket telemetry cache. |
| Action Migration | Port each action in `src/actions/*` to new base class; adjust command dispatch (e.g., `socket.call` compatibility, state updates). |
| Property Inspector | Rebuild inspector UI with Stream Dock PI scaffolding; implement dynamic rendering for 20 OBS forms; debounce saving; add reconnect button. |
| Manifest & Assets | Write Stream Dock `manifest.json` (controllers, actions, icons). Convert SVG assets to host-supported formats. |
| Build System | Configure TypeScript compilation to Node target, bundler (esbuild/webpack) for plugin executable, packaging scripts (`npm run package:streamdock`). |
| QA & Tooling | Write smoke-test scripts (mock OBS servers), manual test matrix (20 connection scenarios), logging verification. |

## 6. Milestones & Timeline (estimate)
1. **M1 – Foundations (1.5 days)**
   - Review Stream Dock SDK, confirm event parity, create project skeleton.
   - Implement OBS manager with 20 connections and write unit tests.
   - Draft new manifest & asset conversion pipeline.
2. **M2 – Core Port (3 days)**
   - Migrate action framework and key actions (stream, record, scene, mute) to new runtime.
   - Expand property inspector for 20 endpoints and global settings.
   - Integrate telemetry feedback (state, colors, debugging).
3. **M3 – Full Action Coverage & QA (2 days)**
   - Port remaining advanced actions (raw request, filters, stats).
   - Finalize packaging, logging, localization, documentation.
   - Manual integration tests on Stream Dock app with multiple OBS instances.

## 7. Risks & Mitigations
- **SDK Parity Gaps**: Some Stream Deck features (multi-actions, custom images) may behave differently. Mitigation: build adapter layer with fallback behavior; prioritize core buttons first.
- **Performance With 20 OBS**: Increased load might cause UI lag. Mitigation: throttle state updates, use connection pools and asynchronous batching.
- **Packaging Constraints**: Stream Dock may require signed binaries. Mitigation: plan early conversation with marketplace guidelines; provide manual install instructions for testing.
- **Time Overrun**: Porting all actions is substantial. Mitigation: phase delivery—core actions first, advanced actions later.

## 8. Deliverables
- Stream Dock plugin folder ready for packaging.
- Build scripts (`npm run build:streamdock`, `npm run package:streamdock`).
- User documentation (installation + configuration for 20 OBS).
- QA checklist and test logs.
- Post-migration report summarizing differences vs Stream Deck version.
