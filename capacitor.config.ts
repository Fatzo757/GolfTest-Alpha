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
    }
  }
};

export default config;
