import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'beaver.notes.pocket',
  appName: 'Beaver Notes Pocket',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
