import { EventEmitter } from 'node:events';
import { ObsController } from './obs-controller';
const MAX_CONNECTIONS = 20;
export class ObsManager extends EventEmitter {
    logger;
    controllers = new Map();
    telemetry = new Map();
    constructor(logger) {
        super();
        this.logger = logger;
    }
    initialize(settings) {
        const normalized = this.normalizeSettings(settings);
        for (const setting of normalized) {
            this.upsertController(setting);
        }
        this.syncTelemetry();
    }
    updateSettings(settings) {
        const normalized = this.normalizeSettings(settings);
        for (const setting of normalized) {
            this.upsertController(setting);
        }
        this.syncTelemetry();
    }
    getTelemetry() {
        return Array.from(this.telemetry.values()).sort((a, b) => a.id - b.id);
    }
    async setSceneAll(sceneName) {
        const results = { success: [], failed: [] };
        await Promise.all(Array.from(this.controllers.values()).map(async (controller) => {
            if (!controller.isConnected) {
                results.failed.push({ id: controller.id, reason: 'Not connected' });
                return;
            }
            try {
                await controller.setScene(sceneName);
                results.success.push(controller.id);
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                results.failed.push({ id: controller.id, reason });
                this.logger.warn({ id: controller.id, sceneName, reason }, 'Failed to set scene');
            }
        }));
        return results;
    }
    async muteAll(muted) {
        const results = { success: [], failed: [] };
        await Promise.all(Array.from(this.controllers.values()).map(async (controller) => {
            if (!controller.isConnected) {
                results.failed.push({ id: controller.id, reason: 'Not connected' });
                return;
            }
            try {
                await controller.muteAllAudioInputs(muted);
                results.success.push(controller.id);
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                results.failed.push({ id: controller.id, reason });
                this.logger.warn({ id: controller.id, reason }, 'Failed to mute inputs');
            }
        }));
        return results;
    }
    normalizeSettings(settings) {
        const safeSettings = [];
        for (let i = 1; i <= MAX_CONNECTIONS; i++) {
            const provided = settings.find((s) => s.id === i);
            safeSettings.push(provided ?? {
                id: i,
                host: '127.0.0.1',
                port: 4455,
                enabled: false
            });
        }
        return safeSettings;
    }
    upsertController(settings) {
        let controller = this.controllers.get(settings.id);
        if (!controller) {
            controller = new ObsController(settings, this.logger);
            controller.onTelemetry((telemetry) => {
                this.telemetry.set(telemetry.id, telemetry);
                this.emit('telemetry', this.getTelemetry());
            });
            controller.onLog((message) => {
                this.emit('log', { level: 'info', message });
            });
            controller.onControllerError((error) => {
                this.emit('log', { level: 'error', message: error.message });
            });
            this.controllers.set(settings.id, controller);
        }
        controller.updateSettings(settings);
        if (settings.enabled) {
            void controller.connect();
        }
    }
    syncTelemetry() {
        for (const [id, controller] of this.controllers.entries()) {
            this.telemetry.set(id, controller.currentTelemetry);
        }
        this.emit('telemetry', this.getTelemetry());
    }
}
//# sourceMappingURL=obs-manager.js.map