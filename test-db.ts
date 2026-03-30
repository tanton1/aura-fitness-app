import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Default database

async function test() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    console.log("Success! Read", snapshot.docs.length, "documents from default db");
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
