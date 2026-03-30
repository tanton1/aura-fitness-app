import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Force reload: 2026-03-29
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn('Failed to initialize Firebase Analytics', e);
    }
  }
});
