import { registerPlugin } from '@capacitor/core';

import type { MorphProtocolPlugin } from './definitions';

const MorphProtocol = registerPlugin<MorphProtocolPlugin>('MorphProtocol', {
  web: () => import('./web').then(m => new m.MorphProtocolWeb()),
});

export * from './definitions';
export { MorphProtocol };
