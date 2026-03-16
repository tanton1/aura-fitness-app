import { UserProfile, MealTemplate } from '../types';
import { mealTemplates } from '../data/mealTemplates';

export const getMealsForDay = (dayIndex: number, profile: UserProfile): MealTemplate[] => {
  const allBreakfasts = mealTemplates.filter(t => t.name.includes('Bữa sáng:'));
  const allSnacks = mealTemplates.filter(t => t.name.includes('Bữa phụ:'));
  const allMainMeals = mealTemplates.filter(t => !t.name.includes('Bữa phụ:') && !t.name.includes('Bữa sáng:'));

  // Generate a unique seed for this user and day
  const seedStr = (profile.name || 'user') + dayIndex.toString();
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed += seedStr.charCodeAt(i);
  }

  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const getRandomItem = <T>(arr: T[], s: number, exclude: T[] = []): T => {
    const available = arr.filter(item => !exclude.includes(item));
    if (available.length === 0) return arr[0]; // Fallback
    return available[Math.floor(seededRandom(s) * available.length)];
  };

  const breakfast = getRandomItem(allBreakfasts.length > 0 ? allBreakfasts : allMainMeals, seed + 1);
  const lunch = getRandomItem(allMainMeals, seed + 2);
  const snack = getRandomItem(allSnacks, seed + 3);
  const dinner = getRandomItem(allMainMeals, seed + 4, [lunch]);

  const dailyMeals = [breakfast, lunch, snack, dinner];

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
