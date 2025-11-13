import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.morphprotocol.demo',
  appName: 'MorphProtocol Demo',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    MorphProtocol: {
      // Plugin configuration if needed
    }
  }
};

export default config;
