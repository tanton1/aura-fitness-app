import React, { useState } from 'react';
import { UserProfile } from '../../types';
import Dashboard from '../Dashboard';
import WeekPlan from '../WeekPlan';
import Progress from '../Progress';
import CheckIn from '../CheckIn';
import { Home, Calendar, LineChart, Target } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetProfile: () => void;
  onNavigate: (screen: string) => void;
}

export default function PersonalDashboard({ profile, onUpdateProfile, onResetProfile, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'week_plan' | 'progress' | 'check_in'>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Hôm nay', icon: Home },
    { id: 'week_plan', label: 'Kế hoạch', icon: Calendar },
    { id: 'progress', label: 'Tiến độ', icon: LineChart },
    { id: 'check_in', label: 'Check-in', icon: Target },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Navigation Tabs */}
      <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-3 overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 ${
                  isActive 
                    ? 'bg-zinc-100 text-zinc-950 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-105' 
                    : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === 'dashboard' && <Dashboard profile={profile} onUpdateProfile={onUpdateProfile} />}
        {activeTab === 'week_plan' && <WeekPlan profile={profile} onNavigate={onNavigate} />}
        {activeTab === 'progress' && <Progress profile={profile} onUpdateProfile={onUpdateProfile} onResetProfile={onResetProfile} />}
        {activeTab === 'check_in' && <CheckIn />}
      </div>
    </div>
  );
}
