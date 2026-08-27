import Constants from 'expo-constants';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
// Les types du SDK pointent sur le build web, où cet export n'existe pas ;
// il est bien présent dans le build React Native chargé par Metro.
// @ts-expect-error getReactNativePersistence absent des déclarations web
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FirebaseExtra {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  functionsRegion: string;
}

// Injectée par app.config.ts depuis les variables EXPO_PUBLIC_FIREBASE_*
// (voir .env.example) : un projet Firebase par environnement.
const firebaseExtra = Constants.expoConfig?.extra?.firebase as FirebaseExtra | undefined;
if (!firebaseExtra) {
  throw new Error('Configuration Firebase absente : définir les variables EXPO_PUBLIC_FIREBASE_* (voir .env.example)');
}

const { functionsRegion, ...firebaseConfig } = firebaseExtra;

/** Doit correspondre à functions/src/admin.ts (REGION). */
export const FUNCTIONS_REGION = functionsRegion;

const FIREBASE_APP = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const FIREBASE_DB = getFirestore(FIREBASE_APP);
const FIREBASE_STORAGE = getStorage(FIREBASE_APP);
const FIREBASE_FUNCTIONS = getFunctions(FIREBASE_APP, FUNCTIONS_REGION);

export { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB, FIREBASE_STORAGE, FIREBASE_FUNCTIONS };
