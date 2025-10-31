import OBSWebSocket, { EventSubscription, OBSRequestTypes } from 'obs-websocket-js';
import { EventEmitter } from 'node:events';
import type { ObsConnectionSettings, ObsTelemetry } from '../../../shared/types';
import type pino from 'pino';

const DEFAULT_RECONNECT_INTERVAL_MS = 5000;
const STATS_INTERVAL_MS = 2000;

const AUDIO_INPUT_KINDS = [
  'wasapi_input_capture',
  'wasapi_output_capture',
  'coreaudio_input_capture',
  'coreaudio_output_capture',
  'pulse_input_capture',
  'pulse_output_capture',
  'wasapi_process_output',
  'pipewire_output_capture',
  'pipewire_input_capture',
  'ffmpeg_source',
  'dshow_input'
];

type VolumeMetersEvent = {
  inputs: Array<{
    inputLevelsDb: Array<number | null>;
  }>;
};

type StreamStatusEvent = {
  outputSkippedFrames?: number;
  cpuUsage?: number;
};

type RecordStatusEvent = {
  outputSkippedFrames?: number;
};

type InputListResponse = {
  inputs: Array<{
    inputName: string;
    inputKind?: string | null;
    unversionedInputKind?: string | null;
  }>;
};

export class ObsController extends EventEmitter {
  private readonly obs = new OBSWebSocket();
  private settings: ObsConnectionSettings;
  private telemetry: ObsTelemetry;
  private reconnectTimer?: NodeJS.Timeout;
  private statsTimer?: NodeJS.Timeout;
  private audioInputs: string[] = [];
  private isConnecting = false;

  constructor(settings: ObsConnectionSettings, private readonly logger: pino.Logger) {
    super();
    this.settings = settings;
    this.telemetry = {
      id: settings.id,
      connected: false
    };
    this.registerHandlers();
  }

  private registerHandlers() {
    this.obs.on('ConnectionOpened', () => {
      this.logger.info({ id: this.settings.id }, 'OBS connection opened');
    });

    this.obs.on('Hello', (helloData) => {
      this.logger.info(
        {
          id: this.settings.id,
          obsWebSocketVersion: helloData.obsWebSocketVersion,
          rpcVersion: helloData.rpcVersion
        },
        'OBS said hello'
      );
    });

    this.obs.on('Identified', () => {
      this.logger.info({ id: this.settings.id }, 'OBS identified');
      this.updateTelemetry({
        connected: true,
        lastError: undefined
      });
      this.emit('log', `OBS #${this.settings.id} connected`);
      void this.postIdentifySetup();
    });

    this.obs.on('ConnectionClosed', (event) => {
      this.logger.warn(
        { id: this.settings.id, code: event.code, reason: event.message },
        'OBS connection closed'
      );
      this.updateTelemetry({
        connected: false,
        streamState: 'offline',
        recordState: 'stopped',
        lastError: event.message
      });
      this.emit('log', `OBS #${this.settings.id} disconnected (${event.message ?? event.code})`);
      this.scheduleReconnect();
    });

    this.obs.on('StreamStateChanged', (data) => {
      this.updateTelemetry({
        streamState: data.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED' ? 'live' : 'offline'
      });
    });

    this.obs.on('StreamStatus' as any, (raw: unknown) => {
      const data = raw as StreamStatusEvent;
      this.updateTelemetry({
        streamDroppedFrames: data.outputSkippedFrames ?? this.telemetry.streamDroppedFrames,
        cpuUsage: data.cpuUsage ?? this.telemetry.cpuUsage
      });
    });

    this.obs.on('RecordStateChanged', (data) => {
      this.updateTelemetry({
        recordState:
          data.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED'
            ? 'recording'
            : data.outputState === 'OBS_WEBSOCKET_OUTPUT_PAUSED'
              ? 'paused'
              : 'stopped'
      });
    });

    this.obs.on('RecordStatus' as any, (raw: unknown) => {
      const data = raw as RecordStatusEvent;
      this.updateTelemetry({
        recordDroppedFrames: data.outputSkippedFrames ?? this.telemetry.recordDroppedFrames
      });
    });

    this.obs.on('InputVolumeMeters', (raw: unknown) => {
      const data = raw as VolumeMetersEvent;
      const levelsDb = data.inputs
        .flatMap((input) => input.inputLevelsDb)
        .filter((value): value is number => typeof value === 'number');
      const maxLevel = levelsDb.length > 0 ? Math.max(...levelsDb) : undefined;
      this.updateTelemetry({
        audioLevelDb: maxLevel
      });
    });

    this.obs.on('error' as any, (error: unknown) => {
      this.logger.error({ id: this.settings.id, error }, 'OBS error');
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    });
  }

  private async postIdentifySetup() {
    try {
      await this.obs.call('Subscribe' as any, {
        eventSubscriptions:
          EventSubscription.All | EventSubscription.InputVolumeMeters | EventSubscription.SceneItems
      });
      await this.refreshAudioInputs();
      this.startStatsPolling();
    }
    catch (error) {
      this.logger.error({ id: this.settings.id, error }, 'Failed post-identify setup');
      this.emit('error', error as Error);
    }
  }

  private async refreshAudioInputs() {
    try {
      const inputs = (await this.obs.call('GetInputList')) as InputListResponse;
      this.audioInputs = inputs.inputs
        .filter(
          (input) => input.unversionedInputKind && AUDIO_INPUT_KINDS.includes(input.unversionedInputKind)
        )
        .map((input) => input.inputName);
      if (this.audioInputs.length === 0) {
        // fallback: try inputs marked as audio
        this.audioInputs = inputs.inputs
          .filter((input) => {
            const kind = input.inputKind ?? '';
            return kind.includes('input') || kind.includes('audio');
          })
          .map((input) => input.inputName);
      }
    }
    catch (error) {
      this.logger.warn({ id: this.settings.id, error }, 'Unable to list audio inputs');
    }
  }

  private startStatsPolling() {
    this.stopStatsPolling();
    this.statsTimer = setInterval(async () => {
      try {
        const stats = await this.obs.call('GetStats');
        this.updateTelemetry({
          cpuUsage: stats.cpuUsage,
          streamDroppedFrames: stats.outputSkippedFrames,
          recordDroppedFrames: stats.outputSkippedFrames
        });
      }
      catch (error) {
        this.logger.warn({ id: this.settings.id, error }, 'Stats polling failed');
      }
    }, STATS_INTERVAL_MS);
  }

  private stopStatsPolling() {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = undefined;
    }
  }

  get currentTelemetry(): ObsTelemetry {
    return { ...this.telemetry };
  }

  get id(): number {
    return this.settings.id;
  }

  get isConnected(): boolean {
    return this.telemetry.connected;
  }

  onTelemetry(listener: (telemetry: ObsTelemetry) => void) {
    this.on('telemetry', listener);
    return this;
  }

  onLog(listener: (message: string) => void) {
    this.on('log', listener);
    return this;
  }

  onControllerError(listener: (error: Error) => void) {
    this.on('error', listener);
    return this;
  }

  updateSettings(settings: ObsConnectionSettings) {
    this.settings = settings;
    this.telemetry = {
      id: settings.id,
      connected: this.telemetry.connected,
      alias: settings.alias,
      cpuUsage: this.telemetry.cpuUsage,
      audioLevelDb: this.telemetry.audioLevelDb,
      recordDroppedFrames: this.telemetry.recordDroppedFrames,
      recordState: this.telemetry.recordState,
      streamDroppedFrames: this.telemetry.streamDroppedFrames,
      streamState: this.telemetry.streamState,
      lastError: this.telemetry.lastError,
      lastHeartbeat: this.telemetry.lastHeartbeat
    };
    if (!settings.enabled) {
      void this.disconnect();
    }
    else if (!this.isConnected && !this.isConnecting) {
      void this.connect();
    }
  }

  async connect() {
    if (this.isConnecting || this.telemetry.connected || !this.settings.enabled) {
      return;
    }
    this.isConnecting = true;
    const url = `ws://${this.settings.host}:${this.settings.port}`;
    try {
      await this.obs.connect(url, this.settings.password);
    }
    catch (error) {
      this.logger.error({ id: this.settings.id, error }, 'Failed to connect OBS');
      this.updateTelemetry({
        connected: false,
        lastError: error instanceof Error ? error.message : String(error)
      });
      this.scheduleReconnect();
    }
    finally {
      this.isConnecting = false;
    }
  }

  async disconnect() {
    this.stopStatsPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    await this.obs.disconnect();
    this.updateTelemetry({
      connected: false
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, DEFAULT_RECONNECT_INTERVAL_MS);
  }

  private updateTelemetry(partial: Partial<ObsTelemetry>) {
    this.telemetry = {
      ...this.telemetry,
      ...partial,
      id: this.settings.id,
      alias: this.settings.alias,
      lastHeartbeat: Date.now()
    };
    this.emitTelemetry();
  }

  private emitTelemetry() {
    const telemetry: ObsTelemetry = { ...this.telemetry };
    this.emit('telemetry', telemetry);
  }

  async setScene(sceneName: string) {
    if (!this.telemetry.connected) {
      throw new Error('OBS not connected');
    }
    await this.obs.call('SetCurrentProgramScene', {
      sceneName
    } satisfies OBSRequestTypes['SetCurrentProgramScene']);
  }

  async muteAllAudioInputs(muted: boolean) {
    if (!this.telemetry.connected) {
      throw new Error('OBS not connected');
    }
    if (this.audioInputs.length === 0) {
      await this.refreshAudioInputs();
    }
    await Promise.all(
      this.audioInputs.map(async (inputName) => {
        await this.obs.call('SetInputMute', {
          inputName,
          inputMuted: muted
        } satisfies OBSRequestTypes['SetInputMute']);
      })
    );
  }
}
