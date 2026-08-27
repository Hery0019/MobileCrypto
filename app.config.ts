import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

/**
 * Configuration Expo : app.json + paramètres d'environnement.
 * Les variables EXPO_PUBLIC_FIREBASE_* viennent de .env (dev) ou des
 * variables d'environnement du profil EAS (preview/production). Voir
 * .env.example. Elles identifient le projet Firebase ; elles ne sont pas
 * secrètes (la sécurité repose sur les règles et les Cloud Functions).
 */
// Accès statiques à process.env : Expo inline les variables EXPO_PUBLIC_*
// à la compilation et interdit l'accès dynamique (expo/no-dynamic-env-var).
const firebase = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  functionsRegion: process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? 'europe-west1',
};

const missing = Object.entries(firebase)
  .filter(([, value]) => !value)
  .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`);
if (missing.length > 0) {
  throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')} (voir .env.example)`);
}

// app.json est typé par inférence (orientation: string, …) : on l'assume ExpoConfig.
const base = appJson.expo as ExpoConfig;

const config: ExpoConfig = {
  ...base,
  extra: {
    ...appJson.expo.extra,
    firebase,
  },
};

export default config;
