import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import WeekPlan from './components/WeekPlan';
import CheckIn from './components/CheckIn';
import SchedulerWrapper from './components/SchedulerWrapper';
import Progress from './components/Progress';
import BottomNav from './components/BottomNav';
import AuthScreen from './components/AuthScreen';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

import AdminDashboard from './components/admin/AdminDashboard';
import PersonalDashboard from './components/admin/PersonalDashboard';

import FoodDatabase from './components/FoodDatabase';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Force sign out if the user is anonymous (from previous version)
        if (currentUser.isAnonymous) {
          await auth.signOut();
          return;
        }

        setUser(currentUser);
        // Load profile from Firestore
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          if (['admin', 'manager'].includes(data.role || '')) {
            setCurrentScreen('overview');
          } else if (['trainer', 'sales'].includes(data.role || '')) {
            setCurrentScreen('personal');
          }
        }
        
        // Listen for real-time updates
        const unsubSnapshot = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
        });
        
        setLoading(false);
        return () => unsubSnapshot();
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('aura_profile');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('aura_profile', JSON.stringify(newProfile)); // Keep local backup
    if (user) {
      await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
    }
    setCurrentScreen('dashboard');
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('aura_profile', JSON.stringify(updatedProfile)); // Keep local backup
    if (user) {
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
    }
  };

  const handleResetProfile = () => {
    setCurrentScreen('onboarding');
  };

  if (loading) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile || currentScreen === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} initialData={profile || undefined} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard profile={profile} onUpdateProfile={handleUpdateProfile} />;
      case 'week_plan':
        return <WeekPlan profile={profile} onNavigate={setCurrentScreen} />;
      case 'food_db':
        return <FoodDatabase onNavigate={setCurrentScreen} />;
      case 'progress':
        return <Progress profile={profile} onUpdateProfile={handleUpdateProfile} onResetProfile={handleResetProfile} />;
      case 'check_in':
        return <CheckIn />;
      case 'scheduler':
        return <SchedulerWrapper user={user} profile={profile} />;
      case 'personal':
        return <PersonalDashboard profile={profile} onUpdateProfile={handleUpdateProfile} onResetProfile={handleResetProfile} onNavigate={setCurrentScreen} />;
      case 'overview':
        return <AdminDashboard user={user} profile={profile} activeTab="overview" onNavigate={setCurrentScreen} />;
      case 'students':
        return <AdminDashboard user={user} profile={profile} activeTab="students" onNavigate={setCurrentScreen} />;
      case 'finance':
        return <AdminDashboard user={user} profile={profile} activeTab="finance" onNavigate={setCurrentScreen} />;
      case 'hr':
        return <AdminDashboard user={user} profile={profile} activeTab="hr" onNavigate={setCurrentScreen} />;
      case 'payroll':
        return <AdminDashboard user={user} profile={profile} activeTab="payroll" onNavigate={setCurrentScreen} />;
      default:
        return <Dashboard profile={profile} onUpdateProfile={handleUpdateProfile} />;
    }
  };

  const isFullWidth = ['scheduler', 'overview', 'students', 'finance', 'hr', 'payroll'].includes(currentScreen);

  return (
    <div className={`bg-zinc-950 min-h-screen font-sans text-zinc-100 relative overflow-hidden shadow-2xl ${isFullWidth ? 'w-full' : 'max-w-md mx-auto'}`}>
      <div className="p-4 flex justify-center">
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} profile={profile} />
    </div>
  );
}
