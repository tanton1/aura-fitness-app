import React, { useState, useEffect } from 'react';
import { UserProfile, StudentContract } from '../../types';
import { User } from 'firebase/auth';
import StudentManagement from './StudentManagement';
import FinanceManagement from './FinanceManagement';
import HRManagement from './HRManagement';
import TrainerPayroll from './TrainerPayroll';
import PackageSettings from './PackageSettings';
import { useDatabase } from '../../contexts/DatabaseContext';

import AdminReportDashboard from './AdminReportDashboard';

interface Props {
  user: User | null;
  profile: UserProfile | null;
  activeTab: 'overview' | 'students' | 'finance' | 'hr' | 'payroll' | 'packages';
  onNavigate?: (screen: string) => void;
}

export default function AdminDashboard({ user, profile, activeTab, onNavigate }: Props) {
  const { contracts, migrateData, isMigrating, isMigrated } = useDatabase();
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
    setLastUpdate(new Date());
  }, [contracts]);

  const overdueCount = contracts.filter(c => {
    const pending = c.installments?.filter(i => i.status === 'pending') || [];
    if (pending.length === 0 && c.nextPaymentDate && c.paidAmount < c.totalPrice && new Date(c.nextPaymentDate) <= new Date()) {
      return true;
    }
    return pending.some(i => new Date(i.date) <= new Date());
  }).length;

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Tab Content */}
      <div className="p-4 pt-6">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          {!isMigrated && (
            <button
              onClick={migrateData}
              disabled={isMigrating}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg disabled:opacity-50"
            >
              {isMigrating ? 'Migrating Data...' : 'Migrate Data'}
            </button>
          )}
        </div>
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
