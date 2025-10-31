export type ObsConnectionSettings = {
  id: number;
  host: string;
  port: number;
  password?: string;
  enabled: boolean;
  alias?: string;
};

export type GlobalSettings = {
  scenePresets: string[];
};

export type StreamState = 'live' | 'offline' | 'error';
export type RecordState = 'recording' | 'paused' | 'stopped' | 'error';

export type ObsTelemetry = {
  id: number;
  connected: boolean;
  alias?: string;
  cpuUsage?: number;
  streamState?: StreamState;
  streamDroppedFrames?: number;
  recordState?: RecordState;
  recordDroppedFrames?: number;
  audioLevelDb?: number;
  lastHeartbeat?: number;
  lastError?: string;
};

export type TelemetryEvent = {
  type: 'telemetry';
  payload: ObsTelemetry[];
};

export type ActionResult = {
  success: number[];
  failed: Array<{ id: number; reason: string }>;
};

export type SceneRequestPayload = {
  sceneName: string;
};

export type SettingsPayload = {
  connections: ObsConnectionSettings[];
  global: GlobalSettings;
};

export type LogEntry = {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
};
