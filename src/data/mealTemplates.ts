import { MealTemplate } from '../types';

export const mealTemplates: MealTemplate[] = [
  {
    id: 't1',
    name: 'Cơm ức gà áp chảo + Rau muống',
    context: ['home', 'office', 'after-workout'],
    fallback_level: 2,
    swap_keys: ['protein_swap_A', 'carb_swap_A', 'veg_swap_A'],
    taste_profile: ['mặn'],
    items: [
      { foodId: 'f1', multiplier: 1 }, // Cơm
      { foodId: 'f2', multiplier: 1 }, // Ức gà
      { foodId: 'f3', multiplier: 1 }  // Rau muống
    ],
    base_macros: { kcal: 433, protein: 43.5, carb: 42, fat: 8.6 }
  },
  {
    id: 't2',
    name: 'Phở bò tái (ít bánh)',
    context: ['eatout', 'office'],
    fallback_level: 1,
    swap_keys: ['eatout_noodle_swap'],
    taste_profile: ['mặn'],
    items: [
      { foodId: 'f4', multiplier: 1 }
    ],
    base_macros: { kcal: 350, protein: 25, carb: 40, fat: 10 }
  },
  {
    id: 't3',
    name: 'Bữa phụ: Sữa chua + Trứng luộc',
    context: ['office', 'home', 'pms'],
    fallback_level: 1,
    swap_keys: ['snack_swap_A'],
    taste_profile: ['nhạt'],
    items: [
      { foodId: 'f5', multiplier: 1 }, // Trứng
      { foodId: 'f6', multiplier: 1 }  // Sữa chua
    ],
    base_macros: { kcal: 138, protein: 9.8, carb: 5.1, fat: 8.3 }
  },
  {
    id: 't4',
    name: 'Khoai lang + Đậu hũ non xì dầu',
    context: ['home', 'pms'],
    fallback_level: 1,
    swap_keys: ['carb_swap_A', 'protein_swap_B'],
    taste_profile: ['nhạt', 'mặn'],
    items: [
      { foodId: 'f9', multiplier: 1 }, // Khoai lang
      { foodId: 'f8', multiplier: 1 }  // Đậu hũ
    ],
    base_macros: { kcal: 202, protein: 11, carb: 29, fat: 4.6 }
  },
  {
    id: 't5',
    name: 'Cơm thịt băm xào cà chua',
    context: ['home'],
    fallback_level: 2,
    swap_keys: ['protein_swap_A', 'carb_swap_A'],
    taste_profile: ['mặn'],
    items: [
      { foodId: 'f1', multiplier: 1 }, // Cơm
      { foodId: 'f10', multiplier: 1 }, // Thịt băm
      { foodId: 'f3', multiplier: 0.5 } // Rau muống (nửa đĩa)
    ],
    base_macros: { kcal: 412, protein: 23, carb: 43.5, fat: 15.3 }
  }
];
