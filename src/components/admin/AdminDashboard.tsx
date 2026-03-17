import React, { useState, useEffect } from 'react';
import { UserProfile, StudentContract } from '../../types';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import StudentManagement from './StudentManagement';
import FinanceManagement from './FinanceManagement';
import HRManagement from './HRManagement';
import TrainerPayroll from './TrainerPayroll';
import PackageSettings from './PackageSettings';

import AdminReportDashboard from './AdminReportDashboard';

interface Props {
  user: User | null;
  profile: UserProfile | null;
  activeTab: 'overview' | 'students' | 'finance' | 'hr' | 'payroll' | 'packages';
  onNavigate?: (screen: string) => void;
}

export default function AdminDashboard({ user, profile, activeTab, onNavigate }: Props) {
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, 'schedules', 'global_schedule'), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setContracts(data.contracts || []);
          setLastUpdate(new Date());
        }
      });
      return () => unsub();
    }
  }, [user]);

  const overdueCount = contracts.filter(c => {
    const pending = c.installments?.filter(i => i.status === 'pending') || [];
    if (pending.length === 0 && c.nextPaymentDate && c.paidAmount < c.totalPrice && new Date(c.nextPaymentDate) <= new Date()) {
      return true;
    }
    return pending.some(i => new Date(i.date) <= new Date());
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <div className="bg-zinc-900 p-6 rounded-b-3xl shadow-sm flex items-center gap-3">
        <img src="/logo.png" alt="Aura" className="h-10 w-10 object-contain" />
        <h1 className="text-xl font-bold text-white">Aura Fitness Admin</h1>
      </div>
      {/* Tab Content */}
      <div className="p-4 pt-6">
        {activeTab === 'overview' && <AdminReportDashboard onNavigate={onNavigate} />}
        {activeTab === 'students' && <StudentManagement user={user} profile={profile} />}
        {activeTab === 'finance' && <FinanceManagement user={user} profile={profile} />}
        {activeTab === 'packages' && <PackageSettings user={user} />}
        {activeTab === 'hr' && <HRManagement user={user} />}
        {activeTab === 'payroll' && <TrainerPayroll user={user} profile={profile} />}
      </div>
    </div>
  );
}
