import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
  console.log('Fetching students...');
  const studentsSnap = await getDocs(collection(db, 'students'));
  const students = studentsSnap.docs.map(d => ({id: d.id, ...d.data()}));
  
  console.log('Fetching users...');
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(d => ({id: d.id, ...d.data()}));
  
  console.log('Fetching contracts...');
  const contractsSnap = await getDocs(collection(db, 'contracts'));
  const contracts = contractsSnap.docs.map(d => ({id: d.id, ...d.data()}));

  console.log('\n--- FINDING "Võ Thị Bích Ngọc" ---');
  
  const targetStudents = students.filter(s => (s.name || '').toLowerCase().includes('bích ngọc'));
  console.log('Found in students collection:', JSON.stringify(targetStudents, null, 2));
  
  const targetUsers = users.filter(u => (u.name || u.displayName || '').toLowerCase().includes('bích ngọc'));
  console.log('Found in users collection:', JSON.stringify(targetUsers, null, 2));

  // Also check if any contract has her name explicitly (if contracts store names)
  // or check contracts belonging to the found student IDs.
  const allTargetIds = [...new Set([...targetStudents.map(s => s.id), ...targetUsers.map(u => u.id)])];
  console.log('Target IDs:', allTargetIds);
  
  const targetContracts = contracts.filter(c => allTargetIds.includes(c.studentId));
  console.log('Found associated contracts:', JSON.stringify(targetContracts, null, 2));

  // Let's also check if there's an orphaned contract belonging to a missing student ID which might not be in the list above,
  // BUT the contract has a notes/note/studentId that we can match?
  // We can't match name directly if name is only in student, but let's see.

  // Wait, if she is missing from students and users, how does the admin know her name is Bích Ngọc?
  // Maybe her name is written in the contract.packageName or custom notes?
  
  console.log('Done.');
  process.exit(0);
}

main().catch(console.error);
