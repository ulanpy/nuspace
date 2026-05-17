import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kz.nuspace.mobile',
  appName: 'nuspace',
  webDir: 'out',
  server: {
    // In native shells we load the hosted SPA by default.
    url: process.env.CAPACITOR_SERVER ?? 'https://nuspace.kz',
    cleartext: true
  },
};

export default config;
