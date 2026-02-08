import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Using environment variables to prevent exposing credentials in the code.
// You must set these variables in your deployment environment or .env file.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: We must export 'db' so syncService can use it
export const db = getFirestore(app);