import Configstore from 'configstore';
const STORE_ID = 'multi-obs-control-center';
const defaults = {
    connections: Array.from({ length: 20 }, (_value, index) => ({
        id: index + 1,
        host: '127.0.0.1',
        port: 4455,
        enabled: false
    }))
};
const store = new Configstore(STORE_ID, defaults);
export const getConnections = () => store.get('connections');
export const saveConnections = (connections) => {
    store.set('connections', connections);
};
//# sourceMappingURL=store.js.map