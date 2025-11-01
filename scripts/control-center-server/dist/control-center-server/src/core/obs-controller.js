import OBSWebSocket, { EventSubscription } from 'obs-websocket-js';
import { EventEmitter } from 'node:events';
const DEFAULT_RECONNECT_INTERVAL_MS = 5000;
const STATS_INTERVAL_MS = 2000;
const VOLUME_EMIT_INTERVAL_MS = 120;
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
export class ObsController extends EventEmitter {
    logger;
    obs = new OBSWebSocket();
    settings;
    telemetry;
    reconnectTimer;
    statsTimer;
    audioInputs = [];
    isConnecting = false;
    volumeDebugLogged = false;
    volumeEmitTimer;
    lastVolumeEmit = 0;
    constructor(settings, logger) {
        super();
        this.logger = logger;
        this.settings = settings;
        this.telemetry = {
            id: settings.id,
            connected: false
        };
        this.registerHandlers();
    }
    registerHandlers() {
        this.obs.on('ConnectionOpened', () => {
            this.logger.info({ id: this.settings.id }, 'OBS connection opened');
        });
        this.obs.on('Hello', (helloData) => {
            this.logger.info({
                id: this.settings.id,
                obsWebSocketVersion: helloData.obsWebSocketVersion,
                rpcVersion: helloData.rpcVersion
            }, 'OBS said hello');
        });
        this.obs.on('Identified', () => {
            this.logger.info({ id: this.settings.id }, 'OBS identified');
            this.volumeDebugLogged = false;
            this.updateTelemetry({
                connected: true,
                lastError: undefined
            });
            this.emit('log', `OBS #${this.settings.id} connected`);
            void this.postIdentifySetup();
        });
        this.obs.on('ConnectionClosed', (event) => {
            this.logger.warn({ id: this.settings.id, code: event.code, reason: event.message }, 'OBS connection closed');
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
        this.obs.on('StreamStatus', (raw) => {
            const data = raw;
            this.updateTelemetry({
                streamDroppedFrames: data.outputSkippedFrames ?? this.telemetry.streamDroppedFrames,
                cpuUsage: data.cpuUsage ?? this.telemetry.cpuUsage
            });
        });
        this.obs.on('RecordStateChanged', (data) => {
            this.updateTelemetry({
                recordState: data.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED'
                    ? 'recording'
                    : data.outputState === 'OBS_WEBSOCKET_OUTPUT_PAUSED'
                        ? 'paused'
                        : 'stopped'
            });
        });
        this.obs.on('RecordStatus', (raw) => {
            const data = raw;
            this.updateTelemetry({
                recordDroppedFrames: data.outputSkippedFrames ?? this.telemetry.recordDroppedFrames
            });
        });
        this.obs.on('InputVolumeMeters', (raw) => {
            const data = raw;
            let relevantInputs = data.inputs.filter((input) => {
                if (!this.audioInputs.length)
                    return true;
                if (!input.inputName)
                    return false;
                return this.audioInputs.includes(input.inputName);
            });
            if (!relevantInputs.length) {
                relevantInputs = data.inputs;
            }
            const channelPeaks = relevantInputs
                .flatMap((input) => input.inputLevelsMul ?? [])
                .map((channelLevels) => {
                if (!Array.isArray(channelLevels))
                    return null;
                // channelLevels format: [magnitude, peakWithVolume, peakRaw]
                const peakWithVolume = channelLevels[1];
                const fallback = channelLevels[0] ?? channelLevels[2];
                const value = typeof peakWithVolume === 'number' ? peakWithVolume : fallback;
                return typeof value === 'number' ? value : null;
            })
                .filter((value) => typeof value === 'number' && value >= 0);
            const toDb = (value) => {
                if (value <= 0)
                    return -96;
                return 20 * Math.log10(value);
            };
            if (!this.volumeDebugLogged) {
                this.volumeDebugLogged = true;
                const firstInput = relevantInputs[0];
                this.logger.info({
                    id: this.settings.id,
                    inputsTotal: data.inputs.length,
                    relevantInputs: relevantInputs.length,
                    sampleMul: firstInput?.inputLevelsMul
                }, 'InputVolumeMeters sample');
            }
            const maxPeakMul = channelPeaks.length > 0 ? Math.max(...channelPeaks) : undefined;
            const nextLevelDb = typeof maxPeakMul === 'number' ? Math.max(-96, Math.min(0, toDb(maxPeakMul))) : -96;
            const previousLevelDb = typeof this.telemetry.audioLevelDb === 'number' ? this.telemetry.audioLevelDb : -96;
            if (Math.abs(nextLevelDb - previousLevelDb) < 0.4) {
                return;
            }
            this.updateTelemetry({
                audioLevelDb: nextLevelDb
            }, { throttle: true });
        });
        this.obs.on('error', (error) => {
            this.logger.error({ id: this.settings.id, error }, 'OBS error');
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        });
    }
    async postIdentifySetup() {
        await this.refreshAudioInputs();
        this.startStatsPolling();
    }
    async refreshAudioInputs() {
        try {
            const inputs = (await this.obs.call('GetInputList'));
            this.audioInputs = inputs.inputs
                .filter((input) => input.unversionedInputKind && AUDIO_INPUT_KINDS.includes(input.unversionedInputKind))
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
    startStatsPolling() {
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
    stopStatsPolling() {
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
            this.statsTimer = undefined;
        }
    }
    get currentTelemetry() {
        return { ...this.telemetry };
    }
    get id() {
        return this.settings.id;
    }
    get isConnected() {
        return this.telemetry.connected;
    }
    onTelemetry(listener) {
        this.on('telemetry', listener);
        return this;
    }
    onLog(listener) {
        this.on('log', listener);
        return this;
    }
    onControllerError(listener) {
        this.on('error', listener);
        return this;
    }
    updateSettings(settings) {
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
            await this.obs.connect(url, this.settings.password, {
                eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters | EventSubscription.SceneItems
            });
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
        if (this.volumeEmitTimer) {
            clearTimeout(this.volumeEmitTimer);
            this.volumeEmitTimer = undefined;
        }
        await this.obs.disconnect();
        this.updateTelemetry({
            connected: false
        });
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            void this.connect();
        }, DEFAULT_RECONNECT_INTERVAL_MS);
    }
    updateTelemetry(partial, options) {
        this.telemetry = {
            ...this.telemetry,
            ...partial,
            id: this.settings.id,
            alias: this.settings.alias,
            lastHeartbeat: Date.now()
        };
        if (options?.throttle) {
            this.scheduleTelemetryEmit();
        }
        else {
            this.emitTelemetry();
        }
    }
    emitTelemetry() {
        const telemetry = { ...this.telemetry };
        this.emit('telemetry', telemetry);
    }
    scheduleTelemetryEmit() {
        const now = Date.now();
        const elapsed = now - this.lastVolumeEmit;
        if (elapsed >= VOLUME_EMIT_INTERVAL_MS) {
            this.lastVolumeEmit = now;
            this.emitTelemetry();
            return;
        }
        if (this.volumeEmitTimer)
            return;
        const delay = Math.max(10, VOLUME_EMIT_INTERVAL_MS - elapsed);
        this.volumeEmitTimer = setTimeout(() => {
            this.volumeEmitTimer = undefined;
            this.lastVolumeEmit = Date.now();
            this.emitTelemetry();
        }, delay);
    }
    async setScene(sceneName) {
        if (!this.telemetry.connected) {
            throw new Error('OBS not connected');
        }
        await this.obs.call('SetCurrentProgramScene', {
            sceneName
        });
    }
    async muteAllAudioInputs(muted) {
        if (!this.telemetry.connected) {
            throw new Error('OBS not connected');
        }
        if (this.audioInputs.length === 0) {
            await this.refreshAudioInputs();
        }
        await Promise.all(this.audioInputs.map(async (inputName) => {
            await this.obs.call('SetInputMute', {
                inputName,
                inputMuted: muted
            });
        }));
    }
}
//# sourceMappingURL=obs-controller.js.map