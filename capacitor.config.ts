import type { CapacitorConfig } from '@capacitor/cli';

// Tribute photos, admin, and print export are dynamic Next.js route handlers
// (Postgres and Puppeteer). They cannot be emitted with `output: "export"`,
// so the native WebView loads the deployed app. `www/` is the local directory
// Capacitor copies into ios/ and android/ (`npm run cap:sync` refreshes it).
//
// Another origin, baked in at sync time:
//   CAPACITOR_SERVER_URL=http://192.168.1.20:3000 npm run cap:sync
// Bundled static files in www/ (tribute submit will not reach the API):
//   CAPACITOR_SERVER_URL= npm run cap:sync
const configuredUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const serverUrl =
  configuredUrl === undefined ? 'https://hopecopeheal.vercel.app' : configuredUrl;

const config: CapacitorConfig = {
  appId: 'app.hopecopeheal.tributetrail',
  appName: 'Tribute Trail',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    ...(serverUrl
      ? {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        }
      : {}),
  },
};

export default config;
