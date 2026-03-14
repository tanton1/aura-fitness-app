import { UserProfile, MealTemplate } from '../types';
import { mealTemplates } from '../data/mealTemplates';

export const getMealsForDay = (dayIndex: number, profile: UserProfile): MealTemplate[] => {
  const mainMeals = [
    mealTemplates.find(t => t.id === 't2')!, // Phở
    mealTemplates.find(t => t.id === 't1')!, // Cơm ức gà
    mealTemplates.find(t => t.id === 't5')!, // Cơm thịt băm
  ];
  const snacks = [
    mealTemplates.find(t => t.id === 't3')!, // Sữa chua trứng
    mealTemplates.find(t => t.id === 't4')!, // Khoai lang đậu hũ
  ];

  let dailyMeals = [];
  if (dayIndex % 2 === 0) {
    dailyMeals = [mainMeals[0], mainMeals[1], snacks[0], mainMeals[2]];
  } else {
    dailyMeals = [mainMeals[0], mainMeals[2], snacks[1], mainMeals[1]];
  }

  const totalBaseKcal = dailyMeals.reduce((sum, meal) => sum + meal.base_macros.kcal, 0);
  const targetKcal = profile.target_macros?.[profile.current_mode || 'standard']?.kcal || 1500;
  const scale = targetKcal / totalBaseKcal;

  return dailyMeals.map(meal => ({
    ...meal,
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
  }));
};
