import { registerPlugin } from '@capacitor/core';
const Haptics = registerPlugin('Haptics', {
    web: () => import('./web').then(m => new m.HapticsWeb()),
});
export * from './definitions';
export { Haptics };
//# sourceMappingURL=index.js.map