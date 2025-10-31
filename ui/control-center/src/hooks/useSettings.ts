import { useCallback, useEffect, useState } from 'react';
import type { GlobalSettings, ObsConnectionSettings, SettingsPayload } from '@control-center/shared';
import { fetchSettings, updateSettings } from '../api/client';

type SettingsState = {
  connections: ObsConnectionSettings[];
  global: GlobalSettings;
  loading: boolean;
  error?: string;
};

const sortConnections = (connections: ObsConnectionSettings[]) =>
  [...connections].sort((a, b) => a.id - b.id);

export const useSettings = () => {
  const [state, setState] = useState<SettingsState>({
    connections: [],
    global: { scenePresets: ['Scene 1', 'Scene 2', 'Scene 3', 'Scene 4', 'Scene 5'] },
    loading: true
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const response = await fetchSettings();
      setState({
        connections: sortConnections(response.connections),
        global: response.global,
        loading: false
      });
    }
    catch (error) {
      setState({
        connections: [],
        global: { scenePresets: ['Scene 1', 'Scene 2', 'Scene 3', 'Scene 4', 'Scene 5'] },
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (payload: SettingsPayload) => {
    await updateSettings(payload);
    setState({
      connections: sortConnections(payload.connections),
      global: payload.global,
      loading: false
    });
  }, []);

  return {
    connections: state.connections,
    global: state.global,
    loading: state.loading,
    error: state.error,
    reload: load,
    save
  };
};
