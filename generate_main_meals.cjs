const fs = require('fs');

const newMainMeals = [
  { name: 'Cơm gạo lứt Cá lóc kho tộ', items: [{ id: 'f11', mult: 1, kcal: 145, p: 3, c: 30, f: 1.2 }, { id: 'f37', mult: 1, kcal: 150, p: 18, c: 3, f: 7 }, { id: 'f63', mult: 1, kcal: 45, p: 5, c: 4, f: 1 }] },
  { name: 'Bún bò xào Nam Bộ (Eat Clean)', items: [{ id: 'f12', mult: 1, kcal: 165, p: 2.5, c: 38, f: 0.2 }, { id: 'f32', mult: 1, kcal: 220, p: 26, c: 2, f: 12 }, { id: 'f68', mult: 1, kcal: 60, p: 1, c: 3, f: 5 }] },
  { name: 'Khoai lang Ức gà luộc', items: [{ id: 'f17', mult: 1, kcal: 112, p: 2, c: 26, f: 0.1 }, { id: 'f30', mult: 1, kcal: 165, p: 36, c: 0, f: 2.5 }, { id: 'f57', mult: 1, kcal: 30, p: 3, c: 5, f: 0 }] },
  { name: 'Cơm trắng Tôm rang thịt', items: [{ id: 'f1', mult: 1, kcal: 170, p: 3.5, c: 37, f: 0.3 }, { id: 'f41', mult: 1, kcal: 250, p: 18, c: 4, f: 18 }, { id: 'f64', mult: 1, kcal: 80, p: 6, c: 5, f: 4 }] },
  { name: 'Miến xào thịt băm nấm', items: [{ id: 'f14', mult: 1, kcal: 166, p: 0.3, c: 41, f: 0 }, { id: 'f10', mult: 1, kcal: 210, p: 18, c: 4, f: 13 }, { id: 'f75', mult: 1, kcal: 80, p: 4, c: 8, f: 4 }] },
  { name: 'Cơm gạo lứt Đậu hũ chiên', items: [{ id: 'f11', mult: 1, kcal: 145, p: 3, c: 30, f: 1.2 }, { id: 'f46', mult: 1, kcal: 250, p: 15, c: 4, f: 20 }, { id: 'f59', mult: 1, kcal: 70, p: 3, c: 6, f: 4 }] },
  { name: 'Khoai tây Sườn non rim', items: [{ id: 'f25', mult: 1, kcal: 130, p: 3, c: 30, f: 0.2 }, { id: 'f36', mult: 1, kcal: 280, p: 20, c: 5, f: 20 }, { id: 'f61', mult: 1, kcal: 35, p: 2, c: 8, f: 0.2 }] },
  { name: 'Cơm trắng Mực xào cần tỏi', items: [{ id: 'f1', mult: 1, kcal: 170, p: 3.5, c: 37, f: 0.3 }, { id: 'f43', mult: 1, kcal: 140, p: 18, c: 6, f: 5 }, { id: 'f65', mult: 1, kcal: 120, p: 10, c: 10, f: 4 }] },
  { name: 'Cơm gạo lứt Bò xào Kim chi (Hàn)', items: [{ id: 'f11', mult: 1, kcal: 145, p: 3, c: 30, f: 1.2 }, { id: 'f32', mult: 1, kcal: 220, p: 26, c: 2, f: 12 }, { id: 'f105', mult: 1, kcal: 15, p: 1, c: 2, f: 0 }, { id: 'f106', mult: 1, kcal: 40, p: 3, c: 4, f: 1 }] },
  { name: 'Cơm Cá hồi áp chảo (Nhật)', items: [{ id: 'f1', mult: 1, kcal: 170, p: 3.5, c: 37, f: 0.3 }, { id: 'f38', mult: 1, kcal: 206, p: 22, c: 0, f: 13 }, { id: 'f106', mult: 1, kcal: 40, p: 3, c: 4, f: 1 }, { id: 'f107', mult: 1, kcal: 20, p: 2, c: 2, f: 1 }] },
  { name: 'Udon Tôm sú (Nhật)', items: [{ id: 'f104', mult: 1, kcal: 260, p: 8, c: 53, f: 1 }, { id: 'f40', mult: 1, kcal: 99, p: 24, c: 0, f: 0.3 }, { id: 'f58', mult: 1, kcal: 25, p: 2, c: 4, f: 0 }] },
  { name: 'Soba Đậu hũ non (Nhật chay)', items: [{ id: 'f103', mult: 1, kcal: 99, p: 5, c: 21, f: 0.1 }, { id: 'f8', mult: 1, kcal: 90, p: 9, c: 3, f: 4.5 }, { id: 'f107', mult: 1, kcal: 20, p: 2, c: 2, f: 1 }, { id: 'f66', mult: 1, kcal: 15, p: 0.6, c: 3.6, f: 0.1 }] },
  { name: 'Bít tết bò Salad Caesar (Tây)', items: [{ id: 'f25', mult: 1, kcal: 130, p: 3, c: 30, f: 0.2 }, { id: 'f111', mult: 1, kcal: 350, p: 35, c: 0, f: 22 }, { id: 'f113', mult: 1, kcal: 180, p: 5, c: 8, f: 15 }] },
  { name: 'Bánh mì đen Cá ngừ Salad (Tây)', items: [{ id: 'f16', mult: 1, kcal: 150, p: 5, c: 28, f: 2 }, { id: 'f51', mult: 1, kcal: 110, p: 25, c: 0, f: 1 }, { id: 'f67', mult: 1, kcal: 18, p: 0.9, c: 3.9, f: 0.2 }, { id: 'f68', mult: 1, kcal: 60, p: 1, c: 3, f: 5 }] },
  { name: 'Khoai lang Ức gà Măng tây (Tây)', items: [{ id: 'f17', mult: 1, kcal: 112, p: 2, c: 26, f: 0.1 }, { id: 'f2', mult: 1, kcal: 198, p: 37, c: 0, f: 4.3 }, { id: 'f114', mult: 1, kcal: 45, p: 3, c: 5, f: 2 }] },
  { name: 'Miến Sashimi Kim chi (Fusion)', items: [{ id: 'f14', mult: 1, kcal: 166, p: 0.3, c: 41, f: 0 }, { id: 'f112', mult: 1, kcal: 208, p: 20, c: 0, f: 13 }, { id: 'f105', mult: 1, kcal: 15, p: 1, c: 2, f: 0 }] },
  { name: 'Cơm gạo lứt Thịt luộc Rau dền', items: [{ id: 'f11', mult: 1, kcal: 145, p: 3, c: 30, f: 1.2 }, { id: 'f34', mult: 1, kcal: 190, p: 27, c: 0, f: 9 }, { id: 'f72', mult: 1, kcal: 35, p: 4, c: 6, f: 0 }] },
  { name: 'Bún Chả lụa Dưa leo', items: [{ id: 'f12', mult: 1, kcal: 165, p: 2.5, c: 38, f: 0.2 }, { id: 'f47', mult: 1, kcal: 100, p: 8, c: 2, f: 7 }, { id: 'f66', mult: 1, kcal: 15, p: 0.6, c: 3.6, f: 0.1 }, { id: 'f67', mult: 1, kcal: 18, p: 0.9, c: 3.9, f: 0.2 }] },
  { name: 'Cơm trắng Cua biển Súp lơ', items: [{ id: 'f1', mult: 1, kcal: 170, p: 3.5, c: 37, f: 0.3 }, { id: 'f54', mult: 1, kcal: 85, p: 18, c: 0, f: 1 }, { id: 'f60', mult: 1, kcal: 35, p: 3, c: 7, f: 0.4 }] },
  { name: 'Phở khô Nghêu hấp Cải thìa', items: [{ id: 'f26', mult: 1, kcal: 180, p: 4, c: 40, f: 0.5 }, { id: 'f53', mult: 1, kcal: 75, p: 13, c: 4, f: 1 }, { id: 'f59', mult: 1, kcal: 70, p: 3, c: 6, f: 4 }] }
];

let newTemplates = [];
let idCounter = 96; // Start from t96

newMainMeals.forEach(m => {
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
console.log('Added ' + newTemplates.length + ' new main meal templates');
