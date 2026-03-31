# Synaptic Mobile (React Native / Expo)

## Setup
From `/home/adc/synaptic/nikhil_crypto/Synapticbots/mobile-app`:

```bash
npm install
```

## Run (local)
```bash
npm run start
```

The app calls your backend API at `EXPO_PUBLIC_API_BASE_URL` (fallback: `app.json.extra.apiBaseUrl`).

## Required backend env
Your Next.js backend mobile auth uses `MOBILE_JWT_SECRET` (fallback: `NEXTAUTH_SECRET`).

## Running EAS builds
See `eas.json` in this folder.

## Smoke tests
```bash
npm test
```

