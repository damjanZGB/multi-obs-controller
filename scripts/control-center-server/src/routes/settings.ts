import type { Router } from 'express';
import type { ObsManager } from '../core/obs-manager';
import { getConnections, getGlobalSettings, saveConnections, saveGlobalSettings } from '../config/store';
import { settingsSchema } from './schemas';

export const registerSettingsRoutes = (router: Router, obsManager: ObsManager) => {
  router.get('/settings', (_req, res) => {
    res.json({
      connections: getConnections(),
      global: getGlobalSettings()
    });
  });

  router.put('/settings', (req, res) => {
    const parseResult = settingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }

    const { connections, global } = parseResult.data;
    saveConnections(connections);
    saveGlobalSettings(global);
    obsManager.updateSettings(connections);
    res.json({ status: 'ok' });
  });
};
