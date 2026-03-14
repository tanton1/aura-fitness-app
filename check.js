import fs from 'fs';
const stats = fs.statSync('./public/logo.png');
console.log('Size:', stats.size);
