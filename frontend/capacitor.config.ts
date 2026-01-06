import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kz.nuspace.mobile',
  appName: 'nuspace',
  webDir: '.next',
  server: {
    // For Capacitor, we use the production server URL since Next.js 
    // without static export requires a running server
    url: process.env.CAPACITOR_SERVER ?? 'https://nuspace.kz',
    cleartext: true
  },
};

export default config;
