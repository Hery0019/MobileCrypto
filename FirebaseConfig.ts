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

// Configuration publique du projet Firebase (identifie le projet ; la
// sécurité repose sur les règles et les Cloud Functions, pas sur ces valeurs).
const firebaseConfig = {
  apiKey: 'AIzaSyBMsNTkUZEEHLZUvU5UChIDoZSgw0Thf-E',
  authDomain: 'crypto-3e7df.firebaseapp.com',
  projectId: 'crypto-3e7df',
  storageBucket: 'crypto-3e7df.appspot.com',
  messagingSenderId: '459564815290',
  appId: '1:459564815290:web:dd597f2ab2da0e792f4383',
};

/** Doit correspondre à functions/src/admin.ts (REGION). */
export const FUNCTIONS_REGION = 'europe-west1';

const FIREBASE_APP = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const FIREBASE_DB = getFirestore(FIREBASE_APP);
const FIREBASE_STORAGE = getStorage(FIREBASE_APP);
const FIREBASE_FUNCTIONS = getFunctions(FIREBASE_APP, FUNCTIONS_REGION);

export { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB, FIREBASE_STORAGE, FIREBASE_FUNCTIONS };
