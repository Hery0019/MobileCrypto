// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMsNTkUZEEHLZUvU5UChIDoZSgw0Thf-E",
  authDomain: "crypto-3e7df.firebaseapp.com",
  projectId: "crypto-3e7df",
  storageBucket: "crypto-3e7df.appspot.com",
  messagingSenderId: "459564815290",
  appId: "1:459564815290:web:dd597f2ab2da0e792f4383"
};

// Initialize Firebase
let FIREBASE_APP;
if (getApps().length === 0) {
  FIREBASE_APP = initializeApp(firebaseConfig);
} else {
  FIREBASE_APP = getApp();
}

// Initialize Auth with AsyncStorage persistence
const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const FIREBASE_DB = getFirestore(FIREBASE_APP);
const FIREBASE_STORAGE = getStorage(FIREBASE_APP);

export { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB, FIREBASE_STORAGE };
