import Configstore from 'configstore';
const STORE_ID = 'multi-obs-control-center';
const defaults = {
    connections: Array.from({ length: 20 }, (_value, index) => ({
        id: index + 1,
        host: '127.0.0.1',
        port: 4455,
        enabled: false
    })),
    global: {
        scenePresets: ['Scene 1', 'Scene 2', 'Scene 3', 'Scene 4', 'Scene 5']
    }
};
const store = new Configstore(STORE_ID, defaults);
export const getConnections = () => store.get('connections');
export const saveConnections = (connections) => {
    store.set('connections', connections);
};
export const getGlobalSettings = () => store.get('global');
export const saveGlobalSettings = (global) => {
    store.set('global', global);
};
//# sourceMappingURL=store.js.map