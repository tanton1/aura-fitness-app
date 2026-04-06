import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkDb() {
  console.log("Checking database...");
  const studentsSnap = await getDocs(collection(db, 'students'));
  const contractsSnap = await getDocs(collection(db, 'contracts'));
  const sessionsSnap = await getDocs(collection(db, 'sessions'));
  
  let studentsWithoutBranch = 0;
  let contractsWithoutBranch = 0;
  let contractsOverused = 0;
  let sessionsWithoutTrainer = 0;
  let sessionsWithoutStudent = 0;

  studentsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.branchId) studentsWithoutBranch++;
  });

  contractsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.branchId) contractsWithoutBranch++;
    if (data.usedSessions > data.totalSessions) contractsOverused++;
  });

  sessionsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.trainerId) sessionsWithoutTrainer++;
    if (!data.studentId) sessionsWithoutStudent++;
  });

  console.log(`Students without branchId: ${studentsWithoutBranch}`);
  console.log(`Contracts without branchId: ${contractsWithoutBranch}`);
  console.log(`Contracts with usedSessions > totalSessions: ${contractsOverused}`);
  console.log(`Sessions without trainerId: ${sessionsWithoutTrainer}`);
  console.log(`Sessions without studentId: ${sessionsWithoutStudent}`);
  
  process.exit(0);
}

checkDb().catch(console.error);
