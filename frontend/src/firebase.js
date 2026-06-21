import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "community-help-a04a6.firebaseapp.com",
  projectId: "community-help-a04a6",
  storageBucket: "community-help-a04a6.appspot.com",
  messagingSenderId: "11330555331",
  appId: "1:11330555331:web:994a2cf2cb12e434be8176",
  measurementId: "G-EEVDGW6B2K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
