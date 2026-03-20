import React, { useState, useEffect, Suspense, lazy } from 'react';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// Lazy load components for faster initial load
const Onboarding = lazy(() => import('./components/Onboarding'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const WeekPlan = lazy(() => import('./components/WeekPlan'));
const CheckIn = lazy(() => import('./components/CheckIn'));
const SchedulerWrapper = lazy(() => import('./components/SchedulerWrapper'));
const Progress = lazy(() => import('./components/Progress'));
const BottomNav = lazy(() => import('./components/BottomNav'));
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const PersonalDashboard = lazy(() => import('./components/admin/PersonalDashboard'));
const FoodDatabase = lazy(() => import('./components/FoodDatabase'));

const LoadingSpinner = () => (
  <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);

  // Initialize Firebase Auth
  useEffect(() => {
    // Try to load cached profile immediately for instant perceived load
    const cachedProfile = localStorage.getItem('aura_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        setProfile(parsed);
        if (['admin', 'manager'].includes(parsed.role || '')) {
          setCurrentScreen('overview');
        } else if (['trainer', 'sales'].includes(parsed.role || '')) {
          setCurrentScreen('personal');
        }
        setLoading(false); // Instant load if we have cache
      } catch (e) {
        console.error("Failed to parse cached profile", e);
      }
    }

    let unsubSnapshot: () => void;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthInitializing(false);
      
      if (currentUser) {
        // Force sign out if the user is anonymous (from previous version)
        if (currentUser.isAnonymous) {
          auth.signOut();
          return;
        }

        setUser(currentUser);
        
        // Listen for real-time updates (this also does the initial fetch)
        const docRef = doc(db, 'users', currentUser.uid);
        unsubSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            localStorage.setItem('aura_profile', JSON.stringify(data));
            
            // Only redirect if we haven't already from cache, or if role changed
            if (!cachedProfile || JSON.parse(cachedProfile).role !== data.role) {
              if (['admin', 'manager'].includes(data.role || '')) {
                setCurrentScreen('overview');
              } else if (['trainer', 'sales'].includes(data.role || '')) {
                setCurrentScreen('personal');
              }
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching profile:", error);
          setLoading(false);
        });
        
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('aura_profile');
        setLoading(false);
        if (unsubSnapshot) unsubSnapshot();
      }
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('aura_profile', JSON.stringify(newProfile)); // Keep local backup
    if (user) {
      await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
    }
    
    if (['admin', 'manager'].includes(newProfile.role || '')) {
      setCurrentScreen('overview');
    } else if (['trainer', 'sales'].includes(newProfile.role || '')) {
      setCurrentScreen('personal');
    } else {
      setCurrentScreen('dashboard');
    }
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
    return <LoadingSpinner />;
  }

  if (!user && !isAuthInitializing && !profile) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthScreen />
      </Suspense>
    );
  }

  if (!profile || currentScreen === 'onboarding') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Onboarding onComplete={handleOnboardingComplete} initialData={profile || undefined} />
      </Suspense>
    );
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
          <Suspense fallback={<LoadingSpinner />}>
            {renderScreen()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <Suspense fallback={null}>
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} profile={profile} isFullWidth={isFullWidth} />
      </Suspense>
    </div>
  );
}
