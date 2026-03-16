import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Calendar, ChevronRight, Database } from 'lucide-react';
import { getMealsForDay } from '../utils/mealPlan';
import { foodDb } from '../data/foodDb';

interface Props {
  profile: UserProfile;
  onNavigate: (screen: string) => void;
}

export default function WeekPlan({ profile, onNavigate }: Props) {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  const { weekDates, todayIndex } = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const dates = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    
    const tIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    return { weekDates: dates, todayIndex: tIndex };
  }, []);

  const [selectedDay, setSelectedDay] = useState(todayIndex);

  const targetKcal = profile.target_macros?.[profile.current_mode || 'standard']?.kcal || 1500;

  const currentDayMeals = useMemo(() => {
    return getMealsForDay(selectedDay, profile);
  }, [selectedDay, profile]);

  const totalKcal = currentDayMeals.reduce((sum, meal) => sum + meal.base_macros.kcal, 0);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="bg-zinc-900 p-6 rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif font-medium text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-pink-500" />
            Kế hoạch tuần
          </h1>
          <button 
            onClick={() => onNavigate('food_db')}
            className="flex items-center gap-1.5 bg-pink-500/10 text-pink-400 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-pink-500/20 transition-colors"
          >
            <Database className="w-4 h-4" />
            Kho thực phẩm
          </button>
        </div>

        {/* Calendar Strip */}
        <div className="flex justify-between items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((day, idx) => {
            const date = weekDates[idx].getDate();
            const isToday = idx === todayIndex;
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(idx)}
                className={`flex flex-col items-center justify-center w-12 h-16 rounded-2xl shrink-0 transition-all ${
                  selectedDay === idx 
                    ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(255,0,127,0.5)]' 
                    : isToday 
                      ? 'bg-zinc-800 border border-pink-500/50 text-pink-400'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <span className="text-xs font-medium">{day}</span>
                <span className={`text-sm font-bold mt-1 ${selectedDay === idx ? 'text-white' : isToday ? 'text-pink-400' : 'text-zinc-300'}`}>
                  {date}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Thực đơn ngày {days[selectedDay]}</h2>
          <div className="flex flex-col items-end">
            <span className="text-sm text-pink-400 font-medium bg-pink-500/10 px-3 py-1 rounded-full">
              {totalKcal} / {targetKcal} kcal
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {currentDayMeals.map((meal, idx) => {
            const mealType = idx === 0 ? 'Sáng' : idx === 1 ? 'Trưa' : idx === 2 ? 'Phụ' : 'Tối';
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={`${selectedDay}-${idx}`}
                className="bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-white">{meal.name}</h3>
                  <span className="text-xs text-zinc-500 font-medium uppercase px-2 py-1 bg-zinc-800 rounded-md">
                    {mealType}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {meal.items.map((item, i) => {
                    const food = foodDb.find(f => f.id === item.foodId);
                    if (!food) return null;
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                        <div className="w-1 h-1 rounded-full bg-zinc-600" />
                        <span>{item.multiplier}x {food.portion_common} {food.name} <span className="text-zinc-500 text-xs">({food.macros.kcal} kcal/chuẩn)</span></span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                  <div className="flex gap-3 text-xs text-zinc-500">
                    <span className="text-pink-400 font-medium">{meal.base_macros.kcal} kcal</span>
                    <span>P: {meal.base_macros.protein}g</span>
                    <span>C: {meal.base_macros.carb}g</span>
                    <span>F: {meal.base_macros.fat}g</span>
                  </div>
                  <button className="text-pink-500 hover:text-pink-400">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          
          {currentDayMeals.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              Không có món ăn nào cho ngày này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

