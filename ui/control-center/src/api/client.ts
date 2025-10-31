import axios from 'axios';
import type {
  ActionResult,
  ObsTelemetry,
  SceneRequestPayload,
  SettingsPayload
} from '@control-center/shared';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const fetchHealth = async () => {
  const response = await api.get<{ status: string; telemetry: ObsTelemetry[] }>('/health');
  return response.data;
};

export const fetchSettings = async () => {
  const response = await api.get<SettingsPayload>('/settings');
  return response.data;
};

export const updateSettings = async (payload: SettingsPayload) => {
  await api.put('/settings', payload);
};

export const muteAll = async (muted: boolean) => {
  const response = await api.post<ActionResult>('/actions/mute-all', { muted });
  return response.data;
};

export const setSceneAll = async (payload: SceneRequestPayload) => {
  const response = await api.post<ActionResult>('/actions/set-scene', payload);
  return response.data;
};
