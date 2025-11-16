import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kz.nuspace.mobile',
  appName: 'nuspace',
  webDir: 'dist',
  server: {
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://nuspace.kz',
    cleartext: true
  },
};

export default config;
