const fs = require('fs');

const breakfasts = [
  // Vietnamese Breakfasts
  { id: 'f4', name: 'Phở bò tái', kcal: 450, p: 25, c: 60, f: 12 },
  { id: 'f94', name: 'Bún bò Huế', kcal: 550, p: 30, c: 65, f: 18 },
  { id: 'f97', name: 'Bánh mì thịt chả', kcal: 450, p: 18, c: 50, f: 20 },
  { id: 'f98', name: 'Hủ tiếu Nam Vang', kcal: 480, p: 22, c: 65, f: 14 },
  { id: 'f102', name: 'Mì Quảng', kcal: 500, p: 28, c: 60, f: 16 },
  { id: 'f21', name: 'Xôi gấc', kcal: 290, p: 6, c: 62, f: 1.5 },
  { id: 'f22', name: 'Xôi xéo', kcal: 310, p: 7, c: 58, f: 5 },
  { id: 'f23', name: 'Bánh chưng', kcal: 200, p: 6, c: 28, f: 7 },
  { id: 'f24', name: 'Bánh bao (chay)', kcal: 220, p: 6, c: 45, f: 1.5 },
  { id: 'f20', name: 'Bánh cuốn (chay)', kcal: 280, p: 4, c: 60, f: 2 },
];

const quickBreakfasts = [
  { name: 'Bánh mì ốp la', items: [{ id: 'f15', mult: 1, kcal: 230, p: 7, c: 45, f: 2 }, { id: 'f44', mult: 1, kcal: 210, p: 13, c: 1, f: 17 }] },
  { name: 'Yến mạch sữa chua', items: [{ id: 'f19', mult: 1, kcal: 155, p: 5.5, c: 27, f: 2.5 }, { id: 'f6', mult: 1, kcal: 60, p: 3.5, c: 4.5, f: 3 }] },
  { name: 'Granola sữa chua', items: [{ id: 'f109', mult: 1, kcal: 140, p: 4, c: 16, f: 7 }, { id: 'f108', mult: 1, kcal: 100, p: 10, c: 4, f: 5 }] },
  { name: 'Bánh mì đen bơ đậu phộng', items: [{ id: 'f16', mult: 1, kcal: 150, p: 5, c: 28, f: 2 }, { id: 'f84', mult: 1, kcal: 160, p: 2, c: 8, f: 15 }] },
  { name: 'Khoai lang luộc & Trứng luộc', items: [{ id: 'f17', mult: 1, kcal: 112, p: 2, c: 26, f: 0.1 }, { id: 'f5', mult: 2, kcal: 156, p: 12.6, c: 1.2, f: 10.6 }] },
];

const diverseMeals = [
  { name: 'Mì Soba cá hồi', items: [{ id: 'f103', mult: 1, kcal: 99, p: 5, c: 21, f: 0.1 }, { id: 'f38', mult: 1, kcal: 206, p: 22, c: 0, f: 13 }, { id: 'f106', mult: 1, kcal: 40, p: 3, c: 4, f: 1 }] },
  { name: 'Udon xào bò', items: [{ id: 'f104', mult: 1, kcal: 260, p: 8, c: 53, f: 1 }, { id: 'f32', mult: 1, kcal: 220, p: 26, c: 2, f: 12 }, { id: 'f60', mult: 1, kcal: 35, p: 3, c: 7, f: 0.4 }] },
  { name: 'Cơm gạo lứt & Sashimi', items: [{ id: 'f11', mult: 1, kcal: 145, p: 3, c: 30, f: 1.2 }, { id: 'f112', mult: 1, kcal: 208, p: 20, c: 0, f: 13 }, { id: 'f105', mult: 1, kcal: 15, p: 1, c: 2, f: 0 }] },
  { name: 'Bít tết măng tây', items: [{ id: 'f25', mult: 1, kcal: 130, p: 3, c: 30, f: 0.2 }, { id: 'f111', mult: 1, kcal: 350, p: 35, c: 0, f: 22 }, { id: 'f114', mult: 1, kcal: 45, p: 3, c: 5, f: 2 }] },
  { name: 'Salad Caesar Ức gà', items: [{ id: 'f16', mult: 1, kcal: 150, p: 5, c: 28, f: 2 }, { id: 'f2', mult: 1, kcal: 198, p: 37, c: 0, f: 4.3 }, { id: 'f113', mult: 1, kcal: 180, p: 5, c: 8, f: 15 }] },
];

let newTemplates = [];
let idCounter = 76; // Start from t76

// Add Vietnamese Breakfasts
breakfasts.forEach(b => {
  newTemplates.push({
    id: `t${idCounter++}`,
    name: `Bữa sáng: ${b.name}`,
    context: ['home', 'office'],
    fallback_level: 2,
    swap_keys: [],
    taste_profile: ['mặn'],
    items: [{ foodId: b.id, multiplier: 1 }],
    base_macros: { kcal: b.kcal, protein: b.p, carb: b.c, fat: b.f }
  });
});

// Add Quick Breakfasts
quickBreakfasts.forEach(b => {
  const kcal = Math.round(b.items.reduce((s, i) => s + i.kcal, 0));
  const protein = Math.round(b.items.reduce((s, i) => s + i.p, 0));
  const carb = Math.round(b.items.reduce((s, i) => s + i.c, 0));
  const fat = Math.round(b.items.reduce((s, i) => s + i.f, 0));

  newTemplates.push({
    id: `t${idCounter++}`,
    name: `Bữa sáng: ${b.name}`,
    context: ['home', 'office'],
    fallback_level: 2,
    swap_keys: [],
    taste_profile: ['mặn', 'ngọt'],
    items: b.items.map(i => ({ foodId: i.id, multiplier: i.mult })),
    base_macros: { kcal, protein, carb, fat }
  });
});

// Add Diverse Meals
diverseMeals.forEach(m => {
  const kcal = Math.round(m.items.reduce((s, i) => s + i.kcal, 0));
  const protein = Math.round(m.items.reduce((s, i) => s + i.p, 0));
  const carb = Math.round(m.items.reduce((s, i) => s + i.c, 0));
  const fat = Math.round(m.items.reduce((s, i) => s + i.f, 0));

  newTemplates.push({
    id: `t${idCounter++}`,
    name: `Bữa chính: ${m.name}`,
    context: ['home', 'office'],
    fallback_level: 2,
    swap_keys: [],
    taste_profile: ['mặn'],
    items: m.items.map(i => ({ foodId: i.id, multiplier: i.mult })),
    base_macros: { kcal, protein, carb, fat }
  });
});

const templatesStr = newTemplates.map(t => `  {
    id: '${t.id}',
    name: '${t.name}',
    context: ${JSON.stringify(t.context)},
    fallback_level: ${t.fallback_level},
    swap_keys: ${JSON.stringify(t.swap_keys)},
    taste_profile: ${JSON.stringify(t.taste_profile)},
    items: ${JSON.stringify(t.items)},
    base_macros: ${JSON.stringify(t.base_macros)}
  }`).join(',\n');

const fileContent = fs.readFileSync('src/data/mealTemplates.ts', 'utf-8');
const updatedContent = fileContent.replace(/];\s*$/, `,\n${templatesStr}\n];`);
fs.writeFileSync('src/data/mealTemplates.ts', updatedContent);
console.log('Added ' + newTemplates.length + ' new templates');
