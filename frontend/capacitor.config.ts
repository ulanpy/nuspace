import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kz.nuspace.mobile',
  appName: 'nuspace',
  webDir: 'dist',
  server: {
    url: process.env.CAPACITOR_SERVER ?? 'https://nuspace.kz',
    cleartext: true
  },
};

export default config;
