import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc, runTransaction, updateDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Student, StudentContract, PaymentRecord, Session, Trainer, Branch, TrainingPackage, StaffMember, DailyCheckin, Schedule, Warning, ScheduleEntry, LeaveRequest, ScheduleConfig } from '../types';
import { onAuthStateChanged } from 'firebase/auth';

interface DatabaseContextType {
  students: Student[];
  contracts: StudentContract[];
  payments: PaymentRecord[];
  sessions: Session[];
  trainers: Trainer[];
  branches: Branch[];
  packages: TrainingPackage[];
  staff: StaffMember[];
  dailyCheckins: DailyCheckin[];
  leaveRequests: LeaveRequest[];
  schedules: { [weekId: string]: { schedule: Schedule, warnings: Warning[], overriddenSessions?: Record<string, number> } };
  scheduleConfig: ScheduleConfig;
  
  addStudent: (student: Student) => Promise<void>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  
  addContract: (contract: StudentContract) => Promise<void>;
  updateContract: (contract: StudentContract) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  
  addPayment: (payment: PaymentRecord) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  
  addSession: (session: Session) => Promise<void>;
  updateSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  
  addTrainer: (trainer: Trainer) => Promise<void>;
  updateTrainer: (trainer: Trainer) => Promise<void>;
  deleteTrainer: (id: string) => Promise<void>;
  
  addBranch: (branch: Branch) => Promise<void>;
  updateBranch: (branch: Branch) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  
  addPackage: (pkg: TrainingPackage) => Promise<void>;
  updatePackage: (pkg: TrainingPackage) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  
  addStaff: (staffMember: StaffMember) => Promise<void>;
  updateStaff: (staffMember: StaffMember) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  
  addDailyCheckin: (checkin: DailyCheckin) => Promise<void>;
  updateDailyCheckin: (checkin: DailyCheckin) => Promise<void>;
  deleteDailyCheckin: (id: string) => Promise<void>;

  addLeaveRequest: (request: LeaveRequest) => Promise<void>;
  updateLeaveRequest: (request: LeaveRequest) => Promise<void>;
  deleteLeaveRequest: (id: string) => Promise<void>;
  
  updateScheduleData: (weekId: string, schedule: Schedule, warnings: Warning[]) => Promise<void>;
  updateScheduleSlot: (weekId: string, slotId: string, updater: (currentEntries: ScheduleEntry[]) => ScheduleEntry[]) => Promise<void>;
  updateScheduleSlots: (weekId: string, updater: (currentSchedule: Schedule) => { [slotId: string]: ScheduleEntry[] }) => Promise<void>;
  updateSessionOverrides: (weekId: string, studentId: string, sessions: number) => Promise<void>;
  updateBulkSessionOverrides: (weekId: string, overrides: Record<string, number>) => Promise<void>;
  updateScheduleConfig: (config: ScheduleConfig) => Promise<void>;
  updateUserProfile: (uid: string, data: any) => Promise<void>;
  
  refreshData: () => Promise<void>;
  
  migrateData: () => Promise<void>;
  isMigrating: boolean;
  isMigrated: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
};

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [dailyCheckins, setDailyCheckins] = useState<DailyCheckin[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [schedules, setSchedules] = useState<{ [weekId: string]: { schedule: Schedule, warnings: Warning[], overriddenSessions?: Record<string, number> } }>({});
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    workingDays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    workingHours: [6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20],
    lockDayOfWeek: 6, // 6 means Saturday (CN is 0)
    lockHour: 12
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMigrated, setIsMigrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshData = async () => {
    if (!isAuthenticated) return;
    
    // Fetch static data that doesn't need real-time updates
    const staticCollections = [
      { name: 'payments', setter: setPayments },
      { name: 'branches', setter: setBranches },
      { name: 'packages', setter: setPackages },
      { name: 'staff', setter: setStaff },
      { name: 'dailyCheckins', setter: setDailyCheckins },
    ];

    for (const { name, setter } of staticCollections) {
      const snapshot = await getDocs(collection(db, name));
      setter(snapshot.docs.map(doc => doc.data() as any));
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Fetch static data once
    refreshData();

    // Set up real-time listeners for scheduling-critical data
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student));
    }));

    unsubs.push(onSnapshot(collection(db, 'contracts'), (snapshot) => {
      setContracts(snapshot.docs.map(doc => doc.data() as StudentContract));
    }));

    unsubs.push(onSnapshot(collection(db, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(doc => doc.data() as Session));
    }));

    unsubs.push(onSnapshot(collection(db, 'leaveRequests'), (snapshot) => {
      setLeaveRequests(snapshot.docs.map(doc => doc.data() as LeaveRequest));
    }));

    unsubs.push(onSnapshot(doc(db, 'settings', 'scheduleConfig'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Partial<ScheduleConfig>;
        setScheduleConfig(prev => ({
          ...prev,
          ...data
        }));
      }
    }));

    // Fetch trainers once instead of real-time
    const fetchTrainers = async () => {
      const trainersSnapshot = await getDocs(collection(db, 'trainers'));
      setTrainers(trainersSnapshot.docs.map(doc => doc.data() as Trainer));
    };
    fetchTrainers();

    // Set up real-time listener for schedules
    unsubs.push(onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const newSchedules: { [weekId: string]: { schedule: Schedule, warnings: Warning[], overriddenSessions?: Record<string, number> } } = {};
      snapshot.docs.forEach(doc => {
        if (doc.id === 'global_schedule') return; // Handled separately
        const data = doc.data();
        newSchedules[doc.id] = {
          schedule: data.schedule || {},
          warnings: data.warnings || [],
          overriddenSessions: data.overriddenSessions || {}
        };
      });
      setSchedules(newSchedules);
    }));

    unsubs.push(onSnapshot(doc(db, 'schedules', 'global_schedule'), (doc) => {
      if (doc.exists()) {
        setIsMigrated(!!doc.data().migrated);
      }
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [isAuthenticated]);

  const migrateData = async () => {
    if (!isAuthenticated) return;
    setIsMigrating(true);
    try {
      const globalDoc = await getDoc(doc(db, 'schedules', 'global_schedule'));
      if (globalDoc.exists()) {
        const data = globalDoc.data();
        const batch = writeBatch(db);
        
        const migrateCollection = (items: any[], collectionName: string) => {
          if (items && Array.isArray(items)) {
            items.forEach(item => {
              if (item.id) {
                const docRef = doc(db, collectionName, item.id);
                batch.set(docRef, item);
              }
            });
          }
        };

        migrateCollection(data.students, 'students');
        migrateCollection(data.contracts, 'contracts');
        migrateCollection(data.payments, 'payments');
        migrateCollection(data.sessions, 'sessions');
        migrateCollection(data.trainers, 'trainers');
        migrateCollection(data.branches, 'branches');
        migrateCollection(data.packages, 'packages');
        migrateCollection(data.staff, 'staff');

        await batch.commit();
        
        // Mark as migrated
        await setDoc(doc(db, 'schedules', 'global_schedule'), { migrated: true }, { merge: true });
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const sanitize = (obj: any) => {
    const cleanObj = { ...obj };
    Object.keys(cleanObj).forEach(key => {
      if (cleanObj[key] === undefined) {
        delete cleanObj[key];
      }
    });
    return cleanObj;
  };

  const addStudent = async (student: Student) => {
    await setDoc(doc(db, 'students', student.id), sanitize(student));
  };
  const updateStudent = async (id: string, updates: Partial<Student>) => {
    await updateDoc(doc(db, 'students', id), sanitize(updates));
  };
  const deleteStudent = async (id: string) => {
    await deleteDoc(doc(db, 'students', id));
  };

  const addContract = async (contract: StudentContract) => {
    await setDoc(doc(db, 'contracts', contract.id), sanitize(contract));
  };
  const updateContract = async (contract: StudentContract) => {
    await setDoc(doc(db, 'contracts', contract.id), sanitize(contract), { merge: true });
  };
  const deleteContract = async (id: string) => {
    await deleteDoc(doc(db, 'contracts', id));
  };

  const addPayment = async (payment: PaymentRecord) => {
    await setDoc(doc(db, 'payments', payment.id), sanitize(payment));
  };
  const deletePayment = async (id: string) => {
    await deleteDoc(doc(db, 'payments', id));
  };

  const addSession = async (session: Session) => {
    await setDoc(doc(db, 'sessions', session.id), sanitize(session));
  };
  const updateSession = async (session: Session) => {
    await setDoc(doc(db, 'sessions', session.id), sanitize(session), { merge: true });
  };
  const deleteSession = async (id: string) => {
    await deleteDoc(doc(db, 'sessions', id));
  };

  const addTrainer = async (trainer: Trainer) => {
    await setDoc(doc(db, 'trainers', trainer.id), sanitize(trainer));
  };
  const updateTrainer = async (trainer: Trainer) => {
    await setDoc(doc(db, 'trainers', trainer.id), sanitize(trainer), { merge: true });
  };
  const deleteTrainer = async (id: string) => {
    await deleteDoc(doc(db, 'trainers', id));
  };

  const addBranch = async (branch: Branch) => {
    await setDoc(doc(db, 'branches', branch.id), sanitize(branch));
  };
  const updateBranch = async (branch: Branch) => {
    await setDoc(doc(db, 'branches', branch.id), sanitize(branch), { merge: true });
  };
  const deleteBranch = async (id: string) => {
    await deleteDoc(doc(db, 'branches', id));
  };

  const addPackage = async (pkg: TrainingPackage) => {
    await setDoc(doc(db, 'packages', pkg.id), sanitize(pkg));
  };
  const updatePackage = async (pkg: TrainingPackage) => {
    await setDoc(doc(db, 'packages', pkg.id), sanitize(pkg), { merge: true });
  };
  const deletePackage = async (id: string) => {
    await deleteDoc(doc(db, 'packages', id));
  };

  const addStaff = async (staffMember: StaffMember) => {
    await setDoc(doc(db, 'staff', staffMember.id), sanitize(staffMember));
  };
  const updateStaff = async (staffMember: StaffMember) => {
    await setDoc(doc(db, 'staff', staffMember.id), sanitize(staffMember), { merge: true });
  };
  const deleteStaff = async (id: string) => {
    await deleteDoc(doc(db, 'staff', id));
  };

  const addDailyCheckin = async (checkin: DailyCheckin) => {
    await setDoc(doc(db, 'dailyCheckins', checkin.id), sanitize(checkin));
  };
  const updateDailyCheckin = async (checkin: DailyCheckin) => {
    await setDoc(doc(db, 'dailyCheckins', checkin.id), sanitize(checkin), { merge: true });
  };
  const deleteDailyCheckin = async (id: string) => {
    await deleteDoc(doc(db, 'dailyCheckins', id));
  };

  const addLeaveRequest = async (request: LeaveRequest) => {
    await setDoc(doc(db, 'leaveRequests', request.id), sanitize(request));
  };
  const updateLeaveRequest = async (request: LeaveRequest) => {
    await setDoc(doc(db, 'leaveRequests', request.id), sanitize(request), { merge: true });
  };
  const deleteLeaveRequest = async (id: string) => {
    await deleteDoc(doc(db, 'leaveRequests', id));
  };

  const updateScheduleData = async (weekId: string, newSchedule: Schedule, newWarnings: Warning[]) => {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, 'schedules', weekId);
      transaction.set(docRef, {
        schedule: newSchedule,
        warnings: newWarnings
      }, { merge: true });

      // SYNC SESSIONS if already deployed
      const isDeployed = sessions.some(s => s.scheduleEntryId?.startsWith(weekId));
      if (isDeployed) {
        // Find all scheduled sessions for this week and remove them to recreate from new schedule
        // DO NOT delete completed, cancelled, or noshow sessions
        const sessionsToDelete = sessions.filter(s => s.scheduleEntryId?.startsWith(weekId) && s.status === 'scheduled');
        sessionsToDelete.forEach(s => {
          transaction.delete(doc(db, 'sessions', s.id));
        });

        const mondayStr = weekId.replace('schedule_', '');
        const [year, month, day] = mondayStr.split('-').map(Number);
        const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

        Object.entries(newSchedule).forEach(([slotId, entries]) => {
          const [dayCode, hour] = slotId.split('-');
          const dayIndex = dayNames.indexOf(dayCode);
          if (dayIndex === -1) return;
          const targetDate = new Date(year, month - 1, day + dayIndex);
          const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

          entries.forEach(entry => {
            if (entry.type === 'off') return;
            const sessionId = `${slotId}-${entry.studentId}-${dateStr}`;
            
            // Skip if session already exists and is not 'scheduled'
            const existingSession = sessions.find(s => s.id === sessionId);
            if (existingSession && existingSession.status !== 'scheduled') return;

            const contract = contracts.find(c => c.studentId === entry.studentId && c.status === 'active');
            const sessionData: Session = {
              id: sessionId,
              trainerId: entry.trainerId,
              studentId: entry.studentId,
              date: dateStr,
              status: 'scheduled',
              branchId: entry.branchId || contract?.branchId || trainers.find(t => t.id === entry.trainerId)?.branchId || null,
              verifiedByStudent: false,
              scheduleEntryId: `${weekId}-${slotId}-${entry.studentId}`
            };
            transaction.set(doc(db, 'sessions', sessionId), sessionData);
          });
        });
      }
    });
  };

  const updateScheduleSlot = async (weekId: string, slotId: string, updater: (currentEntries: ScheduleEntry[]) => ScheduleEntry[]) => {
    const docRef = doc(db, 'schedules', weekId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) return;
      
      const currentSchedule = docSnap.data().schedule || {};
      const currentEntries = currentSchedule[slotId] || [];
      const newEntries = updater(currentEntries);
      
      transaction.update(docRef, {
        [`schedule.${slotId}`]: newEntries
      });

      // SYNC SESSIONS if already deployed
      const isDeployed = sessions.some(s => s.scheduleEntryId?.startsWith(weekId));
      if (isDeployed) {
        const [dayCode, hour] = slotId.split('-');
        const mondayStr = weekId.replace('schedule_', '');
        const [year, month, day] = mondayStr.split('-').map(Number);
        const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const dayIndex = dayNames.indexOf(dayCode);
        if (dayIndex === -1) return;
        const targetDate = new Date(year, month - 1, day + dayIndex);
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        // Remove sessions for students no longer in the slot or if trainer is now OFF
        for (const oldEntry of currentEntries) {
          if (oldEntry.type === 'off') continue;
          const isStillInSlot = newEntries.some(e => e.studentId === oldEntry.studentId && e.trainerId === oldEntry.trainerId && e.type !== 'off');
          if (!isStillInSlot) {
            const sessionId = `${slotId}-${oldEntry.studentId}-${dateStr}`;
            const existingSession = sessions.find(s => s.id === sessionId);
            // Only delete if it's still 'scheduled'. Do not delete historical records.
            if (!existingSession || existingSession.status === 'scheduled') {
              transaction.delete(doc(db, 'sessions', sessionId));
            }
          }
        }

        // Add/Update sessions for students in the new slot
        for (const newEntry of newEntries) {
          if (newEntry.type === 'off') continue;
          const sessionId = `${slotId}-${newEntry.studentId}-${dateStr}`;
          
          const existingSession = sessions.find(s => s.id === sessionId);
          if (existingSession && existingSession.status !== 'scheduled') {
            continue; // Do not overwrite status of completed/cancelled sessions
          }

          const contract = contracts.find(c => c.studentId === newEntry.studentId && c.status === 'active');
          
          const sessionData: Session = {
            id: sessionId,
            trainerId: newEntry.trainerId,
            studentId: newEntry.studentId,
            date: dateStr,
            status: 'scheduled',
            branchId: newEntry.branchId || contract?.branchId || trainers.find(t => t.id === newEntry.trainerId)?.branchId || null,
            verifiedByStudent: false,
            scheduleEntryId: `${weekId}-${slotId}-${newEntry.studentId}`
          };
          transaction.set(doc(db, 'sessions', sessionId), sessionData, { merge: true });
        }
      }
    });
  };

  const updateScheduleSlots = async (weekId: string, updater: (currentSchedule: Schedule) => { [slotId: string]: ScheduleEntry[] }) => {
    const docRef = doc(db, 'schedules', weekId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) return;

      const currentSchedule = docSnap.data().schedule || {};
      const updatedSlots = updater(currentSchedule);

      const updateData: any = {};
      Object.keys(updatedSlots).forEach(slotId => {
        updateData[`schedule.${slotId}`] = updatedSlots[slotId];
      });
      
      if (Object.keys(updateData).length > 0) {
        transaction.update(docRef, updateData);

        // SYNC SESSIONS if already deployed
        const isDeployed = sessions.some(s => s.scheduleEntryId?.startsWith(weekId));
        if (isDeployed) {
          const mondayStr = weekId.replace('schedule_', '');
          const [year, month, day] = mondayStr.split('-').map(Number);
          const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

          Object.keys(updatedSlots).forEach(slotId => {
            const [dayCode, hour] = slotId.split('-');
            const dayIndex = dayNames.indexOf(dayCode);
            if (dayIndex === -1) return;
            const targetDate = new Date(year, month - 1, day + dayIndex);
            const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

            const currentEntries = currentSchedule[slotId] || [];
            const newEntries = updatedSlots[slotId];

            // Remove sessions for students no longer in the slot
            for (const oldEntry of currentEntries) {
              if (oldEntry.type === 'off') continue;
              const isStillInSlot = newEntries.some(e => e.studentId === oldEntry.studentId && e.trainerId === oldEntry.trainerId && e.type !== 'off');
              if (!isStillInSlot) {
                const sessionId = `${slotId}-${oldEntry.studentId}-${dateStr}`;
                const existingSession = sessions.find(s => s.id === sessionId);
                if (!existingSession || existingSession.status === 'scheduled') {
                  transaction.delete(doc(db, 'sessions', sessionId));
                }
              }
            }

            // Add/Update sessions for students in the new slot
            for (const newEntry of newEntries) {
              if (newEntry.type === 'off') continue;
              const sessionId = `${slotId}-${newEntry.studentId}-${dateStr}`;
              
              const existingSession = sessions.find(s => s.id === sessionId);
              if (existingSession && existingSession.status !== 'scheduled') {
                continue; // Do not overwrite status of completed/cancelled sessions
              }

              const contract = contracts.find(c => c.studentId === newEntry.studentId && c.status === 'active');
              
              const sessionData: Session = {
                id: sessionId,
                trainerId: newEntry.trainerId,
                studentId: newEntry.studentId,
                date: dateStr,
                status: 'scheduled',
                branchId: newEntry.branchId || contract?.branchId || trainers.find(t => t.id === newEntry.trainerId)?.branchId || null,
                verifiedByStudent: false,
                scheduleEntryId: `${weekId}-${slotId}-${newEntry.studentId}`
              };
              transaction.set(doc(db, 'sessions', sessionId), sessionData, { merge: true });
            }
          });
        }
      }
    });
  };

  const updateSessionOverrides = async (weekId: string, studentId: string, sessions: number) => {
    const docRef = doc(db, 'schedules', weekId);
    await setDoc(docRef, {
      overriddenSessions: {
        [studentId]: sessions
      }
    }, { merge: true });
  };

  const updateBulkSessionOverrides = async (weekId: string, overrides: Record<string, number>) => {
    const docRef = doc(db, 'schedules', weekId);
    await setDoc(docRef, {
      overriddenSessions: overrides
    }, { merge: true });
  };

  const updateScheduleConfig = async (config: ScheduleConfig) => {
    await setDoc(doc(db, 'settings', 'scheduleConfig'), sanitize(config));
  };

  const updateUserProfile = async (uid: string, data: any) => {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  };

  return (
    <DatabaseContext.Provider value={{
      students, contracts, payments, sessions, trainers, branches, packages, staff, dailyCheckins, leaveRequests,
      addStudent, updateStudent, deleteStudent,
      addContract, updateContract, deleteContract,
      addPayment, deletePayment,
      addSession, updateSession, deleteSession,
      addTrainer, updateTrainer, deleteTrainer,
      addBranch, updateBranch, deleteBranch,
      addPackage, updatePackage, deletePackage,
      addStaff, updateStaff, deleteStaff,
      addDailyCheckin, updateDailyCheckin, deleteDailyCheckin,
      addLeaveRequest, updateLeaveRequest, deleteLeaveRequest,
      schedules, scheduleConfig,
      updateScheduleData, updateScheduleSlot, updateScheduleSlots, updateSessionOverrides, updateBulkSessionOverrides, updateScheduleConfig,
      updateUserProfile,
      refreshData,
      migrateData, isMigrating, isMigrated
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};
