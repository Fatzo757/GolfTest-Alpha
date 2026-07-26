import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.golfgame.app',
  appName: 'GolfGame',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SystemBars: {
      style: "DARK"
    },
    LiveUpdate: {
      appId: 'com.golfgame.app',
      autoDeleteBundles: true,
      readyTimeout: 10000
    }
  }
};

export default config;
