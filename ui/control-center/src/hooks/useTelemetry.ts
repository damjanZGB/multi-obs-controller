import { useEffect, useState } from 'react';
import type { ObsTelemetry } from '@control-center/shared';
import { fetchHealth } from '../api/client';
import { getSocket } from '../lib/socket';

type UseTelemetryState = {
  telemetry: ObsTelemetry[];
  connected: boolean;
  lastUpdated?: number;
};

export const useTelemetry = () => {
  const [state, setState] = useState<UseTelemetryState>({
    telemetry: [],
    connected: false
  });

  useEffect(() => {
    const socket = getSocket();
    let mounted = true;

    fetchHealth()
      .then((response) => {
        if (!mounted) return;
        setState({
          telemetry: response.telemetry ?? [],
          connected: true,
          lastUpdated: Date.now()
        });
      })
      .catch(() => {
        // ignore initial failure, socket will update
      });

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, connected: true }));
    });

    socket.on('telemetry:update', (payload: ObsTelemetry[]) => {
      setState({
        telemetry: payload,
        connected: true,
        lastUpdated: Date.now()
      });
    });

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, connected: false }));
    });

    return () => {
      mounted = false;
      socket.off('telemetry:update');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return state;
};
