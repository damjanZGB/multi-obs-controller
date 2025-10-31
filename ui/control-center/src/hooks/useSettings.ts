import { useCallback, useEffect, useState } from 'react';
import type { ObsConnectionSettings, SettingsPayload } from '@control-center/shared';
import { fetchSettings, updateSettings } from '../api/client';

type SettingsState = {
  settings: ObsConnectionSettings[];
  loading: boolean;
  error?: string;
};

const sortConnections = (connections: ObsConnectionSettings[]) =>
  [...connections].sort((a, b) => a.id - b.id);

export const useSettings = () => {
  const [state, setState] = useState<SettingsState>({
    settings: [],
    loading: true
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const response = await fetchSettings();
      setState({ settings: sortConnections(response.connections), loading: false });
    }
    catch (error) {
      setState({
        settings: [],
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
    setState({ settings: sortConnections(payload.connections), loading: false });
  }, []);

  return {
    settings: state.settings,
    loading: state.loading,
    error: state.error,
    reload: load,
    save
  };
};
