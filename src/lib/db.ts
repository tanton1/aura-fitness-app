import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const saveGlobalSchedule = async (data: any) => {
  const dataToSave = JSON.parse(JSON.stringify(data));
  await setDoc(doc(db, 'schedules', 'global_schedule'), dataToSave, { merge: true });
};
