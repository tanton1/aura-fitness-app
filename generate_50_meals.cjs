const fs = require('fs');

const carbs = [
  { id: 'f1', name: 'Cơm trắng', kcal: 170, p: 3.5, c: 37, f: 0.3 },
  { id: 'f11', name: 'Cơm gạo lứt', kcal: 145, p: 3, c: 30, f: 1.2 },
  { id: 'f12', name: 'Bún tươi', kcal: 165, p: 2.5, c: 38, f: 0.2 },
  { id: 'f14', name: 'Miến dong', kcal: 166, p: 0.3, c: 41, f: 0 },
  { id: 'f17', name: 'Khoai lang', kcal: 112, p: 2, c: 26, f: 0.1 },
  { id: 'f25', name: 'Khoai tây', kcal: 130, p: 3, c: 30, f: 0.2 },
  { id: 'f103', name: 'Mì Soba', kcal: 99, p: 5, c: 21, f: 0.1 },
  { id: 'f104', name: 'Mì Udon', kcal: 260, p: 8, c: 53, f: 1 }
];

const proteins = [
  { id: 'f2', name: 'Ức gà áp chảo', kcal: 198, p: 37, c: 0, f: 4.3 },
  { id: 'f30', name: 'Ức gà luộc', kcal: 165, p: 36, c: 0, f: 2.5 },
  { id: 'f32', name: 'Thịt bò xào', kcal: 220, p: 26, c: 2, f: 12 },
  { id: 'f33', name: 'Thịt bò luộc', kcal: 180, p: 28, c: 0, f: 7 },
  { id: 'f34', name: 'Thịt lợn nạc', kcal: 190, p: 27, c: 0, f: 9 },
  { id: 'f37', name: 'Cá lóc kho', kcal: 150, p: 18, c: 3, f: 7 },
  { id: 'f38', name: 'Cá hồi', kcal: 206, p: 22, c: 0, f: 13 },
  { id: 'f40', name: 'Tôm sú', kcal: 99, p: 24, c: 0, f: 0.3 },
  { id: 'f43', name: 'Mực xào', kcal: 140, p: 18, c: 6, f: 5 },
  { id: 'f5', name: 'Trứng luộc', kcal: 78, p: 6.3, c: 0.6, f: 5.3 },
  { id: 'f8', name: 'Đậu hũ non', kcal: 90, p: 9, c: 3, f: 4.5 },
  { id: 'f46', name: 'Đậu hũ chiên', kcal: 250, p: 15, c: 4, f: 20 },
  { id: 'f111', name: 'Bít tết bò', kcal: 350, p: 35, c: 0, f: 22 },
  { id: 'f112', name: 'Sashimi', kcal: 208, p: 20, c: 0, f: 13 }
];

const veggies = [
  { id: 'f3', name: 'Rau muống xào', kcal: 65, p: 3, c: 5, f: 4 },
  { id: 'f58', name: 'Cải ngọt luộc', kcal: 25, p: 2, c: 4, f: 0 },
  { id: 'f59', name: 'Cải thìa xào', kcal: 70, p: 3, c: 6, f: 4 },
  { id: 'f60', name: 'Súp lơ xanh', kcal: 35, p: 3, c: 7, f: 0.4 },
  { id: 'f61', name: 'Bắp cải luộc', kcal: 35, p: 2, c: 8, f: 0.2 },
  { id: 'f63', name: 'Canh mồng tơi', kcal: 45, p: 5, c: 4, f: 1 },
  { id: 'f64', name: 'Canh bí đao', kcal: 80, p: 6, c: 5, f: 4 },
  { id: 'f65', name: 'Canh chua', kcal: 120, p: 10, c: 10, f: 4 },
  { id: 'f68', name: 'Xà lách trộn', kcal: 60, p: 1, c: 3, f: 5 },
  { id: 'f69', name: 'Đậu cô ve xào', kcal: 85, p: 3, c: 10, f: 4 },
  { id: 'f114', name: 'Măng tây', kcal: 45, p: 3, c: 5, f: 2 },
  { id: 'f105', name: 'Kim chi', kcal: 15, p: 1, c: 2, f: 0 },
  { id: 'f106', name: 'Súp Miso', kcal: 40, p: 3, c: 4, f: 1 }
];

let newTemplates = [];
let idCounter = 116;

// Generate 50 random combinations
for(let i=0; i<50; i++) {
  const carb = carbs[Math.floor(Math.random() * carbs.length)];
  const protein = proteins[Math.floor(Math.random() * proteins.length)];
  const veg = veggies[Math.floor(Math.random() * veggies.length)];
  
  const kcal = Math.round(carb.kcal + protein.kcal + veg.kcal);
  const p = Math.round(carb.p + protein.p + veg.p);
  const c = Math.round(carb.c + protein.c + veg.c);
  const f = Math.round(carb.f + protein.f + veg.f);

  newTemplates.push({
    id: `t${idCounter++}`,
    name: `Bữa chính: ${carb.name} + ${protein.name} + ${veg.name}`,
    context: ['home', 'office'],
    fallback_level: 2,
    swap_keys: [],
    taste_profile: ['mặn'],
    items: [
      { foodId: carb.id, multiplier: 1 },
      { foodId: protein.id, multiplier: 1 },
      { foodId: veg.id, multiplier: 1 }
    ],
    base_macros: { kcal, protein: p, carb: c, fat: f }
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
console.log('Added ' + newTemplates.length + ' new main meal templates');
