import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import pino from 'pino';
import { ObsManager } from './core/obs-manager';
import { getConnections } from './config/store';
import { registerSettingsRoutes } from './routes/settings';
import { registerActionsRoutes } from './routes/actions';
const PORT = Number(process.env.PORT ?? 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = process.env.STATIC_ROOT
    ? path.resolve(process.env.STATIC_ROOT)
    : path.resolve(__dirname, '../../../ui/control-center/dist');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});
const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard'
        }
    }
});
const obsManager = new ObsManager(logger);
obsManager.initialize(getConnections());
app.use(cors());
app.use(express.json());
const apiRouter = express.Router();
registerSettingsRoutes(apiRouter, obsManager);
registerActionsRoutes(apiRouter, obsManager);
apiRouter.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        telemetry: obsManager.getTelemetry()
    });
});
app.use('/api', apiRouter);
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(STATIC_DIR));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(STATIC_DIR, 'index.html'));
    });
}
io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');
    socket.emit('telemetry:update', obsManager.getTelemetry());
    socket.on('disconnect', () => {
        logger.info({ socketId: socket.id }, 'Client disconnected');
    });
});
obsManager.on('telemetry', (payload) => {
    io.emit('telemetry:update', payload);
});
obsManager.on('log', ({ level, message }) => {
    if (level === 'error') {
        logger.error({ module: 'obs-manager' }, message);
    }
    else if (level === 'warn') {
        logger.warn({ module: 'obs-manager' }, message);
    }
    else {
        logger.info({ module: 'obs-manager' }, message);
    }
});
httpServer.listen(PORT, () => {
    logger.info(`Control center server listening on port ${PORT}`);
});
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
});
process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
});
//# sourceMappingURL=index.js.map