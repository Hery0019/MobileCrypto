// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import{getAuth} from "firebase/auth";
import{getFirestore} from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIREBASE_DB = getFirestore(FIREBASE_APP);
export const FIREBASE_STORAGE = getStorage(FIREBASE_APP);
