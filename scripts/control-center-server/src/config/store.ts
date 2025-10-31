import Configstore from 'configstore';
import type { GlobalSettings, ObsConnectionSettings } from '../../../shared/types';

const STORE_ID = 'multi-obs-control-center';

type StoreShape = {
  connections: ObsConnectionSettings[];
  global: GlobalSettings;
};

const defaults: StoreShape = {
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

export const getConnections = (): ObsConnectionSettings[] =>
  store.get('connections') as ObsConnectionSettings[];

export const saveConnections = (connections: ObsConnectionSettings[]) => {
  store.set('connections', connections);
};

export const getGlobalSettings = (): GlobalSettings =>
  store.get('global') as GlobalSettings;

export const saveGlobalSettings = (global: GlobalSettings) => {
  store.set('global', global);
};
