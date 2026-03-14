export const getDatesForWeek = (weekOffset: number = 0) => {
  const today = new Date();
  const currentDay = today.getDay();
  const adjustedDay = currentDay === 0 ? 6 : currentDay - 1;
  const mondayDate = new Date(today);
  
  // Go to Monday of current week, then add weekOffset * 7 days
  mondayDate.setDate(today.getDate() - adjustedDay + (weekOffset * 7));
  
  const dates: Record<string, { display: string, full: string }> = {};
  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  
  dayNames.forEach((day, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    dates[day] = {
      display: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      full: date.toISOString().split('T')[0]
    };
  });
  
  return dates;
};

export const getDatesForCurrentWeek = () => getDatesForWeek(0);

export const getWeekRange = (weekOffset: number = 0) => {
  const today = new Date();
  const currentDay = today.getDay();
  const adjustedDay = currentDay === 0 ? 6 : currentDay - 1;
  
  const start = new Date(today);
  start.setDate(today.getDate() - adjustedDay + (weekOffset * 7));
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getMonthRange = (monthOffset: number = 0) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const isSameDayOrAfter = (dateStr: string, referenceDate: Date) => {
  const d = new Date(dateStr);
  const r = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  r.setHours(0, 0, 0, 0);
  return d >= r;
};
