import * as fs from 'fs';

const proteins = ['Thịt bò nạc', 'Ức gà', 'Cá hồi', 'Cá ngừ', 'Tôm', 'Mực', 'Đậu hũ', 'Trứng gà', 'Chả cá thác lác', 'Nạc dăm heo', 'Cá lóc', 'Thịt heo nạc', 'Cá basa', 'Thịt vịt nạc', 'Cá thu', 'Cá chép', 'Cua biển', 'Ghẹ', 'Hàu', 'Ngao'];
const carbs = ['Gạo lứt', 'Yến mạch', 'Khoai lang', 'Bún lứt', 'Phở lứt', 'Miến dong', 'Bún nưa', 'Hạt diêm mạch (Quinoa)', 'Ngô ngọt', 'Bánh mì đen', 'Khoai tây', 'Bí đỏ', 'Bánh tráng lứt', 'Bún gạo lứt', 'Mì rau củ'];
const veggies = ['Bông cải xanh', 'Cà chua', 'Bắp cải', 'Rau muống', 'Cải thìa', 'Măng tây', 'Bí ngòi', 'Đậu cô ve', 'Rau dền', 'Xà lách', 'Dưa leo', 'Mướp đắng', 'Cải ngọt', 'Rau mồng tơi', 'Rau ngót', 'Cà rốt', 'Su hào', 'Súp lơ trắng', 'Rau cần tây', 'Cải thảo'];
const methods = ['luộc', 'hấp', 'áp chảo', 'nướng', 'xào dầu oliu', 'nấu canh', 'làm salad', 'cuốn'];
const categories = ['breakfast', 'lunch', 'dinner'];

const newDishes: any[] = [];
for (let i = 0; i < 100; i++) {
  const p = proteins[Math.floor(Math.random() * proteins.length)];
  const c = carbs[Math.floor(Math.random() * carbs.length)];
  const v = veggies[Math.floor(Math.random() * veggies.length)];
  const m = methods[Math.floor(Math.random() * methods.length)];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  
  let name = '';
  if (m === 'luộc') name = `${p} luộc ăn kèm ${c} và ${v}`;
  else if (m === 'hấp') name = `${p} hấp ăn kèm ${c} và ${v}`;
  else if (m === 'áp chảo') name = `${p} áp chảo ăn kèm ${c} và ${v}`;
  else if (m === 'nướng') name = `${p} nướng ăn kèm ${c} và ${v}`;
  else if (m === 'xào dầu oliu') name = `${p} xào dầu oliu ăn kèm ${c} và ${v}`;
  else if (m === 'nấu canh') name = `Canh ${v} nấu ${p} ăn kèm ${c}`;
  else if (m === 'làm salad') name = `Salad ${p} ${v} ăn kèm ${c}`;
  else if (m === 'cuốn') name = `Gỏi cuốn ${p} ${v} (dùng ${c})`;

  const calories = Math.floor(Math.random() * (700 - 300 + 1)) + 300;
  
  newDishes.push({
    name,
    ingredients: [p, c, v],
    portionSize: '1 phần',
    calories,
    category: cat
  });
}

const dishesStr = newDishes.map(d => `  {
    "name": "${d.name}",
    "ingredients": ${JSON.stringify(d.ingredients)},
    "portionSize": "${d.portionSize}",
    "calories": ${d.calories},
    "category": "${d.category}"
  }`).join(',\n');

const fileContent = fs.readFileSync('src/data/healthyDishes.ts', 'utf-8');
const updatedContent = fileContent.replace(/];$/, `,\n${dishesStr}\n];`);
fs.writeFileSync('src/data/healthyDishes.ts', updatedContent);
console.log('Added 100 dishes');
