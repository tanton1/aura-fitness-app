const today = new Date('2026-05-16T12:00:00Z');
const currentDay = today.getDay();
const adjustedDay = currentDay === 0 ? 6 : currentDay - 1;
const weekOffset = 1;
const start = new Date(today);
start.setDate(today.getDate() - adjustedDay + (weekOffset * 7));
start.setHours(0, 0, 0, 0);
console.log(start.toISOString());
