import Configstore from 'configstore';
import type { ObsConnectionSettings } from '../../../shared/types';

const STORE_ID = 'multi-obs-control-center';

type StoreShape = {
  connections: ObsConnectionSettings[];
};

const defaults: StoreShape = {
  connections: Array.from({ length: 20 }, (_value, index) => ({
    id: index + 1,
    host: '127.0.0.1',
    port: 4455,
    enabled: false
  }))
};

const store = new Configstore(STORE_ID, defaults);

export const getConnections = (): ObsConnectionSettings[] =>
  store.get('connections') as ObsConnectionSettings[];

export const saveConnections = (connections: ObsConnectionSettings[]) => {
  store.set('connections', connections);
};
