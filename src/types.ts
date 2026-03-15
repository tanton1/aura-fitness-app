export type Day = 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';

export const DAYS: Day[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const HOURS = [6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19];

export interface Macros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  goal: 'fat_loss' | 'muscle_gain' | 'tone';
  workouts_per_week: number;
  eat_out_often: boolean;
  lifestyle: 'busy' | 'active' | 'sedentary';
  budget: 'low' | 'medium' | 'high';
  track_cycle: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  target_macros: { [key: string]: Macros };
  current_mode: 'standard' | 'easy' | 'lean';
  eaten_meals: { [date: string]: MealTemplate[] };
  tdee: number;
  history: ProgressRecord[];
  role?: 'admin' | 'user' | 'trainer' | 'sales' | 'manager';
  branchId?: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  items: FoodItem[];
  base_macros: Macros;
  context: string[];
  swap_keys: string[];
  fallback_level: number;
  taste_profile: string[];
}

export interface FoodItem {
  id?: string;
  foodId?: string;
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  unit?: string;
  amount?: number;
  category?: string;
  multiplier?: number;
  portion_common?: string;
  macros?: Macros;
  trigger_food?: boolean;
}

export interface ProgressRecord {
  id: string;
  date: string;
  weight: number;
  photos: string[];
  body_fat: number;
  waist: number;
  hip: number;
  thigh: number;
}

export interface SwapRule {
  id: string;
  swap_key: string;
  category?: string;
  options: FoodItem[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'trainer' | 'sales' | 'manager';
  branchId?: string;
  status: 'active' | 'inactive';
}

export interface Trainer {
  id: string;
  employeeCode?: string; // Add this
  name: string;
  phone?: string;
  email?: string;
  branchId?: string;
  commissionRate: number; // Percentage for referral
  commissionPerSession?: number; // Fixed amount per session
  status: 'active' | 'inactive';
}

export interface Branch {
  id: string;
  name: string;
  address: string;
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  dob?: string;
  sessionsPerWeek: number;
  availableSlots: string[]; // Format: "T2-6", "T3-14"
  status?: 'active' | 'inactive';
  joinDate?: string;
  branchId?: string;
  isScheduleConfirmed?: boolean;
}

export interface TrainingPackage {
  id: string;
  name: string;
  totalSessions: number;
  price: number;
  durationMonths: number;
  branchId?: string; // Add this
}

export interface Installment {
  id: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid';
}

export interface StudentContract {
  id: string;
  studentId: string;
  trainerId?: string;
  branchId?: string;
  packageId: string;
  packageName: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  usedSessions: number;
  totalPrice: number;
  paidAmount: number;
  discount?: number;
  status: 'active' | 'expired' | 'cancelled';
  nextPaymentDate?: string;
  installments?: Installment[];
  attendedClasses?: string[]; // Array of "slotId-date" like "T2-6-2026-03-16"
  referralCode?: string; // PT employee code
  referralCommission?: number; // Calculated commission amount
}

export interface PaymentRecord {
  id: string;
  contractId: string;
  studentId: string;
  amount: number;
  date: string;
  method: 'cash' | 'transfer';
  note: string;
}

export interface Quote {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  branchId: string;
  packageId: string;
  packageName: string;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  date: string;
  validUntil: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface ScheduleEntry {
  studentId: string;
  trainerId: string;
  isLocked?: boolean;
}

export interface Schedule {
  [slotId: string]: ScheduleEntry[];
}

export interface Warning {
  studentId: string;
  scheduled: number;
  requested: number;
  suggestions: string[];
}

export interface SchedulerResult {
  schedule: Schedule;
  warnings: Warning[];
}

export interface Session {
  id: string;
  trainerId: string;
  studentId: string;
  date: string; // ISO date
  status: 'scheduled' | 'completed' | 'cancelled';
  branchId?: string;
  verifiedByStudent?: boolean; // Add this
}

export interface Payroll {
  id: string;
  trainerId: string;
  month: string; // Format: YYYY-MM
  totalSessions: number;
  totalCommission: number;
  status: 'pending' | 'paid';
}

export interface DailyCheckin {
  id: string; // studentId_date
  studentId: string;
  date: string; // YYYY-MM-DD
  hunger: number;
  energy: number;
  compliance: number;
  note: string;
  waterIntake?: number;
  sleepQuality?: number;
  createdAt: any;
}
