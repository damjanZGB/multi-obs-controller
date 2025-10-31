import { useEffect, useState } from 'react';
import type { LogEntry } from '@control-center/shared';
import { fetchLogs } from '../api/client';
import { getSocket } from '../lib/socket';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    let mounted = true;

    fetchLogs()
      .then((response) => {
        if (mounted) {
          setLogs(response.logs);
        }
      })
      .catch(() => {
        // ignore initial errors
      });

    const socket = getSocket();
    const handleInit = (entries: LogEntry[]) => {
      if (mounted) setLogs(entries);
    };
    const handleAppend = (entry: LogEntry) => {
      if (!mounted) return;
      setLogs((prev) => [...prev.slice(-199), entry]);
    };

    socket.on('log:init', handleInit);
    socket.on('log:append', handleAppend);

    return () => {
      mounted = false;
      socket.off('log:init', handleInit);
      socket.off('log:append', handleAppend);
    };
  }, []);

  return logs;
};
