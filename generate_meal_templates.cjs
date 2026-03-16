const fs = require('fs');

const carbs = [
  { id: 'f1', name: 'Cơm trắng', kcal: 170, p: 3.5, c: 37, f: 0.3 },
  { id: 'f11', name: 'Cơm gạo lứt', kcal: 145, p: 3, c: 30, f: 1.2 },
  { id: 'f12', name: 'Bún tươi', kcal: 165, p: 2.5, c: 38, f: 0.2 },
  { id: 'f14', name: 'Miến dong (khô)', kcal: 166, p: 0.3, c: 41, f: 0 },
  { id: 'f16', name: 'Bánh mì đen', kcal: 150, p: 5, c: 28, f: 2 },
  { id: 'f17', name: 'Khoai lang luộc', kcal: 112, p: 2, c: 26, f: 0.1 },
  { id: 'f18', name: 'Ngô ngọt luộc', kcal: 86, p: 3.2, c: 19, f: 1.2 },
  { id: 'f19', name: 'Yến mạch (khô)', kcal: 155, p: 5.5, c: 27, f: 2.5 },
  { id: 'f25', name: 'Khoai tây luộc', kcal: 130, p: 3, c: 30, f: 0.2 }
];

const proteins = [
  { id: 'f2', name: 'Ức gà áp chảo', kcal: 198, p: 37, c: 0, f: 4.3 },
  { id: 'f30', name: 'Ức gà luộc', kcal: 165, p: 36, c: 0, f: 2.5 },
  { id: 'f32', name: 'Thịt bò xào (nạc)', kcal: 220, p: 26, c: 2, f: 12 },
  { id: 'f33', name: 'Thịt bò luộc (bắp)', kcal: 180, p: 28, c: 0, f: 7 },
  { id: 'f34', name: 'Thịt lợn nạc vai luộc', kcal: 190, p: 27, c: 0, f: 9 },
  { id: 'f37', name: 'Cá lóc kho tộ', kcal: 150, p: 18, c: 3, f: 7 },
  { id: 'f38', name: 'Cá hồi áp chảo', kcal: 206, p: 22, c: 0, f: 13 },
  { id: 'f40', name: 'Tôm sú luộc', kcal: 99, p: 24, c: 0, f: 0.3 },
  { id: 'f42', name: 'Mực ống hấp', kcal: 92, p: 16, c: 3, f: 1.5 },
  { id: 'f5', name: 'Trứng gà luộc', kcal: 78, p: 6.3, c: 0.6, f: 5.3 },
  { id: 'f8', name: 'Đậu hũ non', kcal: 90, p: 9, c: 3, f: 4.5 },
  { id: 'f10', name: 'Thịt băm xào cà chua', kcal: 210, p: 18, c: 4, f: 13 }
];

const veggies = [
  { id: 'f3', name: 'Rau muống xào tỏi', kcal: 65, p: 3, c: 5, f: 4 },
  { id: 'f57', name: 'Rau muống luộc', kcal: 30, p: 3, c: 5, f: 0 },
  { id: 'f58', name: 'Cải ngọt luộc', kcal: 25, p: 2, c: 4, f: 0 },
  { id: 'f60', name: 'Súp lơ xanh luộc', kcal: 35, p: 3, c: 7, f: 0.4 },
  { id: 'f61', name: 'Bắp cải luộc', kcal: 35, p: 2, c: 8, f: 0.2 },
  { id: 'f66', name: 'Dưa leo (Dưa chuột)', kcal: 15, p: 0.6, c: 3.6, f: 0.1 },
  { id: 'f67', name: 'Cà chua', kcal: 18, p: 0.9, c: 3.9, f: 0.2 },
  { id: 'f68', name: 'Xà lách trộn dầu giấm', kcal: 60, p: 1, c: 3, f: 5 }
];

const snacks = [
  { id: 'f6', name: 'Sữa chua không đường', kcal: 60, p: 3.5, c: 4.5, f: 3 },
  { id: 'f77', name: 'Chuối tây', kcal: 89, p: 1.1, c: 23, f: 0.3 },
  { id: 'f78', name: 'Táo', kcal: 78, p: 0.4, c: 21, f: 0.2 },
  { id: 'f85', name: 'Hạt điều rang', kcal: 165, p: 5, c: 9, f: 13 },
  { id: 'f86', name: 'Hạnh nhân', kcal: 170, p: 6, c: 6, f: 15 },
  { id: 'f89', name: 'Socola đen 70%', kcal: 120, p: 1.5, c: 9, f: 8 }
];

let newTemplates = [];
let idCounter = 6;

// Generate 50 Main Meals
for (let i = 0; i < 50; i++) {
  const c = carbs[Math.floor(Math.random() * carbs.length)];
  const p = proteins[Math.floor(Math.random() * proteins.length)];
  const v = veggies[Math.floor(Math.random() * veggies.length)];
  
  const cMult = 1;
  const pMult = p.id === 'f5' ? 2 : 1; // 2 eggs
  const vMult = 1;

  const kcal = Math.round(c.kcal * cMult + p.kcal * pMult + v.kcal * vMult);
  const protein = Math.round(c.p * cMult + p.p * pMult + v.p * vMult);
  const carb = Math.round(c.c * cMult + p.c * pMult + v.c * vMult);
  const fat = Math.round(c.f * cMult + p.f * pMult + v.f * vMult);

  newTemplates.push({
    id: `t${idCounter++}`,
    name: `${c.name} + ${p.name} + ${v.name}`,
    context: ['home', 'office'],
    fallback_level: 2,
    swap_keys: ['protein_swap_A', 'carb_swap_A', 'veg_swap_A'],
    taste_profile: ['mặn'],
    items: [
      { foodId: c.id, multiplier: cMult },
      { foodId: p.id, multiplier: pMult },
      { foodId: v.id, multiplier: vMult }
    ],
    base_macros: { kcal, protein, carb, fat }
  });
}

// Generate 20 Snacks
for (let i = 0; i < 20; i++) {
  const s1 = snacks[Math.floor(Math.random() * snacks.length)];
  let s2 = snacks[Math.floor(Math.random() * snacks.length)];
  while (s1.id === s2.id) s2 = snacks[Math.floor(Math.random() * snacks.length)];
  
  const kcal = Math.round(s1.kcal + s2.kcal);
  const protein = Math.round(s1.p + s2.p);
  const carb = Math.round(s1.c + s2.c);
  const fat = Math.round(s1.f + s2.f);

  newTemplates.push({
    id: `t${idCounter++}`,
    name: `Bữa phụ: ${s1.name} + ${s2.name}`,
    context: ['office', 'home'],
    fallback_level: 1,
    swap_keys: ['snack_swap_A'],
    taste_profile: ['nhạt', 'ngọt'],
    items: [
      { foodId: s1.id, multiplier: 1 },
      { foodId: s2.id, multiplier: 1 }
    ],
    base_macros: { kcal, protein, carb, fat }
  });
}

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
console.log('Added 70 meal templates');
