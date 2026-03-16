import React from 'react';
import { Home, Calendar, ShoppingCart, Target, LineChart, Settings, Users, DollarSign, Briefcase, CreditCard, User } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  profile: UserProfile | null;
}

export default function BottomNav({ currentScreen, onNavigate, profile }: Props) {
  const isStaff = ['admin', 'trainer', 'sales', 'manager'].includes(profile?.role || '');
  const isAdminOrManager = ['admin', 'manager'].includes(profile?.role || '');
  const isAdmin = profile?.role === 'admin';

  let navItems = [];

  if (isStaff) {
    navItems = [
      { id: 'personal', icon: User, label: 'Cá nhân' },
      { id: 'students', icon: Users, label: 'Học viên' },
      { id: 'scheduler', icon: Calendar, label: 'Xếp lịch' },
    ];

    if (isAdminOrManager) {
      navItems.unshift({ id: 'overview', icon: LineChart, label: 'Tổng quan' });
      navItems.push({ id: 'finance', icon: DollarSign, label: 'Tài chính' });
    }
    
    // Payroll for admin, manager, trainer
    if (['admin', 'manager', 'trainer'].includes(profile?.role || '')) {
      navItems.push({ id: 'payroll', icon: CreditCard, label: 'Lương' });
    }

    if (isAdmin) {
      navItems.push({ id: 'hr', icon: Settings, label: 'Cài đặt' });
    }
  } else {
    navItems = [
      { id: 'dashboard', icon: Home, label: 'Hôm nay' },
      { id: 'week_plan', icon: Calendar, label: 'Kế hoạch' },
      { id: 'scheduler', icon: Calendar, label: 'Xếp lịch' },
      { id: 'progress', icon: LineChart, label: 'Tiến độ' },
      { id: 'check_in', icon: Target, label: 'Check-in' },
    ];
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-4 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-1 flex-col items-center gap-1 transition-colors ${
              item.id === 'scheduler' 
                ? 'text-pink-500 font-bold' 
                : isActive 
                  ? 'text-pink-500 drop-shadow-[0_0_5px_rgba(255,0,127,0.8)]' 
                  : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className={`${item.id === 'scheduler' ? 'w-8 h-8' : 'w-6 h-6'} ${isActive ? 'fill-pink-500/20' : ''}`} />
            <span className={`font-medium tracking-wide text-center leading-tight mt-1 ${item.id === 'scheduler' ? 'text-[11px]' : navItems.length > 5 ? 'text-[9px]' : 'text-[10px]'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
