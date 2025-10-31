import { EventEmitter } from 'node:events';
import type pino from 'pino';
import type {
  ActionResult,
  ObsConnectionSettings,
  ObsTelemetry
} from '../../../shared/types';
import { ObsController } from './obs-controller';

type ManagerEvents = {
  telemetry: (payload: ObsTelemetry[]) => void;
  log: (payload: { level: 'info' | 'warn' | 'error'; message: string }) => void;
};

const MAX_CONNECTIONS = 20;

export class ObsManager extends EventEmitter {
  private controllers = new Map<number, ObsController>();
  private telemetry = new Map<number, ObsTelemetry>();

  constructor(private readonly logger: pino.Logger) {
    super();
  }

  initialize(settings: ObsConnectionSettings[]) {
    const normalized = this.normalizeSettings(settings);
    for (const setting of normalized) {
      this.upsertController(setting);
    }
    this.syncTelemetry();
  }

  updateSettings(settings: ObsConnectionSettings[]) {
    const normalized = this.normalizeSettings(settings);
    for (const setting of normalized) {
      this.upsertController(setting);
    }
    this.syncTelemetry();
  }

  getTelemetry(): ObsTelemetry[] {
    return Array.from(this.telemetry.values()).sort((a, b) => a.id - b.id);
  }

  async setSceneAll(sceneName: string): Promise<ActionResult> {
    const results: ActionResult = { success: [], failed: [] };
    await Promise.all(
      Array.from(this.controllers.values()).map(async (controller) => {
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
      })
    );
    return results;
  }

  async muteAll(muted: boolean): Promise<ActionResult> {
    const results: ActionResult = { success: [], failed: [] };
    await Promise.all(
      Array.from(this.controllers.values()).map(async (controller) => {
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
      })
    );
    return results;
  }

  private normalizeSettings(settings: ObsConnectionSettings[]): ObsConnectionSettings[] {
    const safeSettings: ObsConnectionSettings[] = [];
    for (let i = 1; i <= MAX_CONNECTIONS; i++) {
      const provided = settings.find((s) => s.id === i);
      safeSettings.push(
        provided ?? {
          id: i,
          host: '127.0.0.1',
          port: 4455,
          enabled: false
        }
      );
    }
    return safeSettings;
  }

  private upsertController(settings: ObsConnectionSettings) {
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

  private syncTelemetry() {
    for (const [id, controller] of this.controllers.entries()) {
      this.telemetry.set(id, controller.currentTelemetry);
    }
    this.emit('telemetry', this.getTelemetry());
  }
}
