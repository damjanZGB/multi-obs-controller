import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ObsTelemetry } from '@control-center/shared';
import { fetchHealth } from '../api/client';

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

  const socket: Socket = useMemo(
    () =>
      io('/', {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      }),
    []
  );

  useEffect(() => {
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
      socket.disconnect();
    };
  }, [socket]);

  return state;
};
