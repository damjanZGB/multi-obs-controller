import { muteSchema, sceneSchema } from './schemas';
export const registerActionsRoutes = (router, obsManager) => {
    router.post('/actions/set-scene', async (req, res) => {
        const parseResult = sceneSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }
        try {
            const result = await obsManager.setSceneAll(parseResult.data.sceneName);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    router.post('/actions/mute-all', async (req, res) => {
        const parseResult = muteSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.flatten() });
        }
        try {
            const result = await obsManager.muteAll(parseResult.data.muted);
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
};
//# sourceMappingURL=actions.js.map