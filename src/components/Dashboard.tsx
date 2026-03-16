import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, MealTemplate, StudentContract, Session } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Check, X, ArrowLeft, Heart, Bell, History, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { foodDb } from '../data/foodDb';
import Logo from './Logo';
import { getMealsForDay } from '../utils/mealPlan';
import { swapRules } from '../data/swapRules';
import { mealTemplates } from '../data/mealTemplates';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { getWeekRange, getMonthRange, isSameDayOrAfter } from '../utils/dateUtils';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function Dashboard({ profile, onUpdateProfile }: Props) {
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapStep, setSwapStep] = useState<'menu' | 'swap_meal' | 'swap_item'>('menu');
  const [itemToSwap, setItemToSwap] = useState<{ foodId: string, rule: any } | null>(null);
  const [swapSearchTerm, setSwapSearchTerm] = useState('');
  const [showEatOutModal, setShowEatOutModal] = useState(false);
  const [showCravingsModal, setShowCravingsModal] = useState(false);
  const [myContracts, setMyContracts] = useState<StudentContract[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [sessionFilter, setSessionFilter] = useState<'upcoming' | 'history' | 'this_week'>('upcoming');
  const [customRange, setCustomRange] = useState<{ start: string, end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Track local swapped meals (in a real app, this would be saved to profile/db)
  const [swappedMeals, setSwappedMeals] = useState<Record<string, MealTemplate>>({});

  const activeContract = myContracts.find(c => c.status === 'active');

  const filteredSessions = useMemo(() => {
    const now = new Date();
    
    if (sessionFilter === 'this_week') {
      const range = getWeekRange(0);
      return mySessions.filter(s => {
        const d = new Date(s.date);
        return d >= range.start && d <= range.end;
      });
    } else if (sessionFilter === 'upcoming') {
      return mySessions.filter(s => isSameDayOrAfter(s.date, now) && s.status !== 'completed');
    } else {
      return mySessions.filter(s => s.status === 'completed');
    }
  }, [mySessions, sessionFilter]);

  const upcomingSessions = filteredSessions.filter(s => s.status === 'scheduled');
  const historySessions = filteredSessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(doc(db, 'schedules', 'global_schedule'), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const contracts: StudentContract[] = data.contracts || [];
          const sessions: Session[] = data.sessions || [];
          setMyContracts(contracts.filter(c => c.studentId === auth.currentUser?.uid));
          setMySessions(sessions.filter(s => s.studentId === auth.currentUser?.uid));
        }
      });
      return () => unsub();
    }
  }, []);

  const currentMacros = profile.target_macros?.[profile.current_mode || 'standard'] || { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const todayDateStr = new Date().toISOString().split('T')[0];
  const rawEatenMeals = profile.eaten_meals?.[todayDateStr] || [];

  // Get today's meals based on current day of week
  const todayMeals = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const todayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const baseMeals = getMealsForDay(todayIndex, profile);
    
    // Apply local swaps if any
    return baseMeals.map(meal => swappedMeals[meal.id] || meal);
  }, [profile, swappedMeals]);

  // Normalize eaten meals to handle both old string IDs and new MealTemplate objects
  const eatenMealsData = rawEatenMeals.map(item => {
    if (typeof item === 'string') {
      // Old format: fallback to todayMeals (macros will change with mode)
      return todayMeals.find(m => m.id === item);
    }
    // New format: use the stored MealTemplate (macros are preserved)
    return item;
  }).filter(Boolean) as MealTemplate[];

  const eatenMealIds = eatenMealsData.map(m => m.id);

  // Find the next meal that hasn't been eaten
  const nextMeal = todayMeals.find(meal => !eatenMealIds.includes(meal.id));
  const allMealsEaten = todayMeals.length > 0 && !nextMeal;

  // Calculate eaten macros based on the actual eaten meals data
  const totalEatenProtein = eatenMealsData.reduce((acc, meal) => acc + (meal?.base_macros.protein || 0), 0);
  const proteinProgress = Math.min(100, (totalEatenProtein / currentMacros.protein) * 100);
  const totalEatenKcal = eatenMealsData.reduce((acc, meal) => acc + (meal?.base_macros.kcal || 0), 0);

  const handleMarkAsEaten = () => {
    if (!nextMeal) return;
    
    const newEatenMeals = {
      ...(profile.eaten_meals || {}),
      [todayDateStr]: [...rawEatenMeals, nextMeal]
    };
    
    onUpdateProfile({
      ...profile,
      eaten_meals: newEatenMeals
    });
  };

  const openSwapModal = () => {
    setSwapStep('menu');
    setItemToSwap(null);
    setShowSwapModal(true);
  };

  const getItemSwapRule = (foodId: string) => {
    if (!nextMeal) return null;
    for (const key of nextMeal.swap_keys) {
      const rule = swapRules.find(r => r.swap_key === key);
      if (rule && rule.options.some(opt => opt.foodId === foodId)) {
        return rule;
      }
    }
    return null;
  };

  const handleSwapEntireMeal = (newMealTemplate: MealTemplate) => {
    if (!nextMeal) return;
    
    const targetKcal = nextMeal.base_macros.kcal;
    const scale = targetKcal / newMealTemplate.base_macros.kcal;
    
    const scaledMeal = {
      ...newMealTemplate,
      id: nextMeal.id, 
      name: `${newMealTemplate.name} (Đã đổi)`,
      items: newMealTemplate.items.map(item => ({
        ...item,
        multiplier: Number((item.multiplier * scale).toFixed(1))
      })),
      base_macros: {
        kcal: Math.round(newMealTemplate.base_macros.kcal * scale),
        protein: Math.round(newMealTemplate.base_macros.protein * scale),
        carb: Math.round(newMealTemplate.base_macros.carb * scale),
        fat: Math.round(newMealTemplate.base_macros.fat * scale),
      }
    };

    setSwappedMeals(prev => ({
      ...prev,
      [nextMeal.id]: scaledMeal
    }));
    
    setShowSwapModal(false);
  };

  const handleSwapItem = (swapOption: { food: any, ruleOpt: any }) => {
    if (!nextMeal || !itemToSwap) return;

    const originalItem = nextMeal.items.find(i => i.foodId === itemToSwap.foodId);
    if (!originalItem) return;

    const ruleOriginalOpt = itemToSwap.rule.options.find((o: any) => o.foodId === itemToSwap.foodId);
    if (!ruleOriginalOpt) return;

    const ratio = swapOption.ruleOpt.multiplier / ruleOriginalOpt.multiplier;
    const newMultiplier = Number((originalItem.multiplier * ratio).toFixed(1));

    const newItems = nextMeal.items.map(item => {
      if (item.foodId === itemToSwap.foodId) {
        return {
          foodId: swapOption.food.id,
          multiplier: newMultiplier
        };
      }
      return item;
    });

    let newKcal = 0, newProtein = 0, newCarb = 0, newFat = 0;
    newItems.forEach(item => {
       const food = foodDb.find(f => f.id === item.foodId);
       if (food) {
         newKcal += food.macros.kcal * item.multiplier;
         newProtein += food.macros.protein * item.multiplier;
         newCarb += food.macros.carb * item.multiplier;
         newFat += food.macros.fat * item.multiplier;
       }
    });

    const newMeal = {
      ...nextMeal,
      name: nextMeal.name.includes('(Đã đổi)') ? nextMeal.name : `${nextMeal.name} (Đã đổi)`,
      items: newItems,
      base_macros: {
        kcal: Math.round(newKcal),
        protein: Math.round(newProtein),
        carb: Math.round(newCarb),
        fat: Math.round(newFat)
      }
    };

    setSwappedMeals(prev => ({
      ...prev,
      [nextMeal.id]: newMeal
    }));
    
    setShowSwapModal(false);
  };

  const handleEatOutConfirm = () => {
    // Reduce remaining meals by 20% to balance out the cheat meal
    const remainingMeals = todayMeals.filter(m => !eatenMealIds.includes(m.id));
    const newSwaps = { ...swappedMeals };
    
    remainingMeals.forEach(meal => {
      const scale = 0.8; // Reduce by 20%
      newSwaps[meal.id] = {
        ...meal,
        name: `${meal.name} (Đã giảm nhẹ)`,
        items: meal.items.map(item => ({
          ...item,
          multiplier: Number((item.multiplier * scale).toFixed(1))
        })),
        base_macros: {
          kcal: Math.round(meal.base_macros.kcal * scale),
          protein: Math.round(meal.base_macros.protein * scale),
          carb: Math.round(meal.base_macros.carb * scale),
          fat: Math.round(meal.base_macros.fat * scale),
        }
      };
    });
    
    setSwappedMeals(newSwaps);
    setShowEatOutModal(false);
  };

  const cravingOptions = [
    { name: 'Sữa chua Hy Lạp & Quả mọng', kcal: 120, protein: 10, carb: 15, fat: 2 },
    { name: 'Socola đen 70% (2 thanh nhỏ)', kcal: 110, protein: 2, carb: 10, fat: 7 },
    { name: 'Sinh tố chuối bơ đậu phộng', kcal: 200, protein: 8, carb: 25, fat: 8 },
  ];

  const handleCravingSelect = (option: any) => {
    if (!nextMeal) return;
    
    const newMeal: MealTemplate = {
      id: nextMeal.id,
      name: option.name,
      context: ['office', 'home'],
      fallback_level: 1,
      swap_keys: [],
      taste_profile: ['ngọt'],
      items: [], // Empty items, we'll handle this in the UI
      base_macros: {
        kcal: option.kcal,
        protein: option.protein,
        carb: option.carb,
        fat: option.fat
      }
    };
    
    setSwappedMeals(prev => ({
      ...prev,
      [nextMeal.id]: newMeal
    }));
    
    setShowCravingsModal(false);
  };

  const overdueContracts = myContracts.flatMap(c => {
    const pending = c.installments?.filter(i => i.status === 'pending') || [];
    if (pending.length === 0 && c.nextPaymentDate && c.paidAmount < c.totalPrice && new Date(c.nextPaymentDate) <= new Date()) {
      return [{ ...c, overdueAmount: c.totalPrice - c.paidAmount, dueDate: c.nextPaymentDate }];
    }
    return pending.filter(i => new Date(i.date) <= new Date()).map(i => ({
      ...c,
      overdueAmount: i.amount,
      dueDate: i.date
    }));
  });

  const upcomingContracts = myContracts.flatMap(c => {
    const pending = c.installments?.filter(i => i.status === 'pending') || [];
    const today = new Date();
    
    if (pending.length === 0 && c.nextPaymentDate && c.paidAmount < c.totalPrice) {
      const paymentDate = new Date(c.nextPaymentDate);
      const diffDays = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 3) {
        return [{ ...c, upcomingAmount: c.totalPrice - c.paidAmount, dueDate: c.nextPaymentDate }];
      }
      return [];
    }

    return pending.filter(i => {
      const paymentDate = new Date(i.date);
      const diffDays = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 3;
    }).map(i => ({
      ...c,
      upcomingAmount: i.amount,
      dueDate: i.date
    }));
  });

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <div className="bg-zinc-900 p-6 rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-serif font-medium text-white">
              Chào {auth.currentUser?.displayName || 'bạn'}!
            </h1>
            <p className="text-zinc-400 text-sm">Chỉ cần quay lại bữa tiếp theo là ổn nha!</p>
          </div>
          <div className="w-12 h-12">
            <img 
              src="/logo.png" 
              alt="Aura Fitness" 
              className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,0,255,0.3)]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = document.getElementById('avatar-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div id="avatar-fallback" className="hidden w-full h-full bg-gradient-to-br from-pink-500 to-rose-500 rounded-full items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-xl font-bold text-white">
                {auth.currentUser?.displayName?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Notifications */}
        {(overdueContracts.length > 0 || upcomingContracts.length > 0) && (
          <div className="mb-6 space-y-3">
            {overdueContracts.map((contract, idx) => (
              <div key={`${contract.id}-${idx}`} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h4 className="text-red-400 font-bold text-sm">Đã quá hạn thanh toán!</h4>
                  <p className="text-zinc-300 text-xs mt-1">
                    Gói tập <span className="font-bold">{contract.packageName}</span> còn nợ <span className="font-bold text-red-400">{(contract.overdueAmount).toLocaleString('vi-VN')}đ</span>.
                    Vui lòng thanh toán sớm nhé!
                  </p>
                </div>
              </div>
            ))}
            {upcomingContracts.map((contract, idx) => (
              <div key={`${contract.id}-${idx}`} className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-start gap-3">
                <div className="mt-0.5 w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h4 className="text-orange-400 font-bold text-sm">Sắp đến hạn thanh toán</h4>
                  <p className="text-zinc-300 text-xs mt-1">
                    Gói tập <span className="font-bold">{contract.packageName}</span> cần đóng <span className="font-bold text-orange-400">{(contract.upcomingAmount).toLocaleString('vi-VN')}đ</span>.
                    Hạn thanh toán: {new Date(contract.dueDate).toLocaleDateString('vi-VN')}.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex bg-zinc-800 p-1 rounded-xl mb-6">
          {(['easy', 'standard', 'lean'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onUpdateProfile({ ...profile, current_mode: mode })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                profile.current_mode === mode 
                  ? 'bg-zinc-900 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {mode === 'easy' ? 'Dễ bám' : mode === 'standard' ? 'Tiêu chuẩn' : 'Siết'}
            </button>
          ))}
        </div>

        {/* Protein First UI */}
        <div className="bg-zinc-950 text-white p-5 rounded-2xl relative overflow-hidden ring-1 ring-zinc-800">
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <p className="text-zinc-500 text-sm mb-1">Protein mục tiêu</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-light">{Math.round(totalEatenProtein)}</span>
                <span className="text-zinc-500">/ {currentMacros.protein}g</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-sm mb-1">Calories</p>
              <p className="font-medium">{Math.round(totalEatenKcal)} / {currentMacros.kcal}</p>
            </div>
          </div>
          
          {/* Progress bar background */}
          <div className="absolute bottom-0 left-0 h-1.5 bg-zinc-800 w-full">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${proteinProgress}%` }}
              className="h-full bg-pink-500 rounded-r-full shadow-[0_0_10px_rgba(255,0,127,0.8)]"
            />
          </div>
        </div>
      </div>

      {/* Next Meal */}
      <div className="p-6">
        <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-pink-500" />
          {allMealsEaten ? 'Bạn đã hoàn thành thực đơn hôm nay!' : 'Bữa tiếp theo ăn gì?'}
        </h2>

        {nextMeal && (
          <div className="bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-800 mb-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-medium text-white text-lg">{nextMeal.name}</h3>
              <span className="bg-pink-500/10 text-pink-400 text-xs px-2 py-1 rounded-md font-medium">
                {nextMeal.base_macros.kcal} kcal
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              {nextMeal.items.length > 0 ? nextMeal.items.map((item, idx) => {
                const food = foodDb.find(f => f.id === item.foodId);
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    <span>{item.multiplier}x {food?.portion_common} {food?.name} <span className="text-zinc-500 text-xs">({food?.macros.kcal} kcal/chuẩn)</span></span>
                  </div>
                );
              }) : (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span>1 phần {nextMeal.name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={openSwapModal}
                className="flex-1 bg-zinc-800 text-zinc-300 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Swap nhanh
              </button>
              <button 
                onClick={handleMarkAsEaten}
                className="flex-1 bg-pink-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-pink-700 transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                Đã ăn
              </button>
            </div>
          </div>
        )}

        {allMealsEaten && (
          <div className="bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-800 mb-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tuyệt vời!</h3>
            <p className="text-zinc-400 text-sm">Bạn đã hoàn thành tất cả các bữa ăn trong ngày hôm nay. Hãy nghỉ ngơi và chuẩn bị cho ngày mai nhé!</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => setShowEatOutModal(true)}
            className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-left flex flex-col gap-2"
          >
            <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-400" />
            </div>
            <span className="font-medium text-orange-300 text-sm">Tôi lỡ ăn ngoài</span>
            <span className="text-xs text-orange-400/80">App sẽ tự cân bằng lại</span>
          </button>
          
          <button 
            onClick={() => setShowCravingsModal(true)}
            className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-left flex flex-col gap-2"
          >
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-medium text-blue-300 text-sm">Đang thèm ngọt</span>
            <span className="text-xs text-blue-400/80">Gợi ý món thay thế</span>
          </button>
        </div>
      </div>

        {/* Training History */}
        <div className="space-y-6">
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-pink-500" />
                Lịch tập luyện
              </h3>
            </div>

            {/* Filter Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: 'this_week', label: 'Tuần này' },
                { id: 'upcoming', label: 'Sắp tới' },
                { id: 'history', label: 'Lịch sử' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSessionFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                    sessionFilter === f.id 
                      ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_10px_rgba(255,0,127,0.3)]' 
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
          
          <div className="space-y-3">
            {filteredSessions.length > 0 ? (
              filteredSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                  <div>
                    <p className="text-zinc-300 font-medium">{new Date(s.date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    s.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {s.status === 'completed' ? 'Đã hoàn thành' : s.status === 'cancelled' ? 'Đã hủy' : 'Đã lên lịch'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-center py-4">Chưa có lịch tập.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCravingsModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end justify-center p-4">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-zinc-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-white">Gợi ý ăn vặt lành mạnh</h3>
              <button onClick={() => setShowCravingsModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {cravingOptions.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleCravingSelect(opt)}
                  className="w-full p-4 border border-zinc-800 rounded-xl text-left flex justify-between items-center hover:bg-zinc-800 transition-colors"
                >
                  <div>
                    <p className="font-medium text-white">{opt.name}</p>
                    <div className="flex gap-3 text-xs text-zinc-400 mt-1">
                      <span>{opt.kcal} kcal</span>
                      <span>•</span>
                      <span>{opt.protein}g Protein</span>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-500 w-5 h-5" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end justify-center p-4">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-zinc-800 max-h-[85vh] overflow-y-auto pb-8"
          >
            {swapStep === 'menu' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-white">Đổi món nhanh</h3>
                  <button onClick={() => setShowSwapModal(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">Đổi toàn bộ bữa</h4>
                    <button 
                      onClick={() => setSwapStep('swap_meal')}
                      className="w-full p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl text-left flex justify-between items-center hover:bg-pink-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-pink-500" />
                        <div>
                          <p className="font-medium text-pink-500">Tìm bữa ăn khác</p>
                          <p className="text-xs text-pink-400/70">Giữ nguyên lượng Calories mục tiêu</p>
                        </div>
                      </div>
                      <ChevronRight className="text-pink-500 w-5 h-5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">Đổi từng món trong bữa</h4>
                    <div className="space-y-2">
                      {nextMeal?.items.map((item, idx) => {
                        const food = foodDb.find(f => f.id === item.foodId);
                        const rule = getItemSwapRule(item.foodId);
                        
                        return (
                          <button 
                            key={idx}
                            disabled={!rule}
                            onClick={() => {
                              setItemToSwap({ foodId: item.foodId, rule });
                              setSwapStep('swap_item');
                            }}
                            className={`w-full p-4 border rounded-xl text-left flex justify-between items-center transition-colors ${
                              rule 
                                ? 'border-zinc-800 hover:bg-zinc-800' 
                                : 'border-zinc-800/50 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div>
                              <p className="font-medium text-white">{food?.name}</p>
                              <p className="text-xs text-zinc-400">
                                {rule ? 'Nhấn để xem món thay thế' : 'Không có món thay thế'}
                              </p>
                            </div>
                            {rule && <ChevronRight className="text-zinc-500 w-5 h-5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {swapStep === 'swap_meal' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setSwapStep('menu')} className="text-zinc-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-medium text-white">Chọn bữa ăn khác</h3>
                </div>
                <div className="space-y-3">
                  {mealTemplates.filter(m => m.id !== nextMeal?.id).map((meal) => (
                    <button 
                      key={meal.id}
                      onClick={() => handleSwapEntireMeal(meal)}
                      className="w-full p-4 border border-zinc-800 rounded-xl text-left flex justify-between items-center hover:bg-zinc-800 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">{meal.name}</p>
                        <p className="text-xs text-zinc-400">{meal.base_macros.kcal} kcal (Gốc)</p>
                      </div>
                      <ChevronRight className="text-zinc-500 w-5 h-5" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {swapStep === 'swap_item' && itemToSwap && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setSwapStep('menu')} className="text-zinc-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-medium text-white">
                    Đổi {foodDb.find(f => f.id === itemToSwap.foodId)?.name}
                  </h3>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Tìm món ăn..."
                    value={swapSearchTerm}
                    onChange={(e) => setSwapSearchTerm(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="space-y-3">
                  {itemToSwap.rule.options
                    .filter((opt: any) => opt.foodId !== itemToSwap.foodId)
                    .filter((opt: any) => {
                      const food = foodDb.find(f => f.id === opt.foodId);
                      return food?.name.toLowerCase().includes(swapSearchTerm.toLowerCase());
                    })
                    .map((opt: any, idx: number) => {
                      const food = foodDb.find(f => f.id === opt.foodId);
                      return (
                        <button 
                          key={idx}
                          onClick={() => handleSwapItem({ food, ruleOpt: opt })}
                          className="w-full p-4 border border-zinc-800 rounded-xl text-left flex justify-between items-center hover:bg-zinc-800 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-white">{food?.name}</p>
                            <p className="text-xs text-zinc-400">Tương đương lượng dinh dưỡng</p>
                          </div>
                          <ChevronRight className="text-zinc-500 w-5 h-5" />
                        </button>
                      );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {showEatOutModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 text-center border border-zinc-800"
          >
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-white">Không sao đâu!</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Hôm nay mình điều chỉnh nhẹ nha. App sẽ tự động giảm bớt 20% lượng thức ăn ở các bữa còn lại để cân bằng cho bạn.
            </p>
            <button 
              onClick={handleEatOutConfirm}
              className="w-full bg-pink-600 text-white py-3 rounded-xl font-medium hover:bg-pink-700 transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]"
            >
              Cảm ơn Aura
            </button>
            <button 
              onClick={() => setShowEatOutModal(false)}
              className="w-full mt-3 py-3 text-zinc-400 font-medium hover:text-white transition-colors"
            >
              Hủy
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
