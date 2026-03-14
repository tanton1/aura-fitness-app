import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Session, Trainer, StudentContract, Student, PaymentRecord } from '../../types';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AdminReportDashboard() {
  const [timeRange, setTimeRange] = useState('7days');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const docRef = doc(db, 'schedules', 'global_schedule');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessions(data.sessions || []);
        setTrainers(data.trainers || []);
        setContracts(data.contracts || []);
        setStudents(data.students || []);
        setPayments(data.payments || []);
      }
    });
    return () => unsub();
  }, []);

  // PT Sessions Report
  const ptSessions = trainers.map(t => ({
    name: t.name,
    count: sessions.filter(s => s.trainerId === t.id && s.status === 'completed' && s.verifiedByStudent).length
  }));

  // PT Commission Report
  const ptCommissions = trainers.map(t => {
    const completedSessions = sessions.filter(s => s.trainerId === t.id && s.status === 'completed' && s.verifiedByStudent);
    const sessionComm = completedSessions.length * (t.commissionPerSession || 0);
    const referralContracts = contracts.filter(c => c.referralCode === t.employeeCode);
    const referralComm = referralContracts.reduce((s, c) => s + (c.referralCommission || 0), 0);
    return { name: t.name, total: sessionComm + referralComm };
  });

  // Customer Debt Report
  const totalDebt = contracts.reduce((sum, c) => sum + (c.totalPrice - c.paidAmount), 0);
  const debtList = contracts
    .filter(c => c.totalPrice > c.paidAmount)
    .map(c => ({
      name: students.find(s => s.id === c.studentId)?.name || 'Học viên ẩn',
      debt: c.totalPrice - c.paidAmount
    }));

  // Revenue Data (Last 7 days)
  const revenueData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const total = payments
      .filter(p => p.date.startsWith(dateStr))
      .reduce((sum, p) => sum + p.amount, 0);
    return { name: d.toLocaleDateString('vi-VN', { weekday: 'short' }), total };
  });

  // Package Distribution
  const packageData = Object.entries(contracts.reduce((acc, c) => {
    acc[c.packageName] = (acc[c.packageName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  // Recent Transactions
  const recentTransactions = payments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      user: students.find(s => s.id === p.studentId)?.name || 'Học viên ẩn',
      package: contracts.find(c => c.id === p.contractId)?.packageName || 'N/A',
      amount: p.amount.toLocaleString('vi-VN') + 'đ',
      status: 'Thành công',
      date: new Date(p.date).toLocaleString('vi-VN')
    }));

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tổng quan báo cáo</h1>
          <p className="text-zinc-400 text-sm mt-1">Theo dõi hiệu suất kinh doanh và hoạt động của phòng tập.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          {['7days', '30days', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === range 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {range === '7days' ? '7 Ngày' : range === '30days' ? '30 Ngày' : 'Năm nay'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Tổng doanh thu" 
          value={payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('vi-VN') + 'đ'}
          trend="+12.5%" 
          isPositive={true} 
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />} 
        />
        <KPICard 
          title="Học viên mới" 
          value={students.length.toString()} 
          trend="+8.2%" 
          isPositive={true} 
          icon={<Users className="w-5 h-5 text-indigo-500" />} 
        />
        <KPICard 
          title="Giao dịch" 
          value={payments.length.toString()} 
          trend="-2.4%" 
          isPositive={false} 
          icon={<CreditCard className="w-5 h-5 text-rose-500" />} 
        />
        <KPICard 
          title="Hợp đồng active" 
          value={contracts.filter(c => c.status === 'active').length.toString()} 
          trend="+4.1%" 
          isPositive={true} 
          icon={<Activity className="w-5 h-5 text-blue-500" />} 
        />
      </div>

      {/* New Reports - PT & Debt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PT Sessions */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Số buổi dạy của PT</h3>
          <div className="space-y-3">
            {ptSessions.map(pt => (
              <div key={pt.name} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-zinc-300">{pt.name}</span>
                <span className="text-pink-500 font-bold">{pt.count} buổi</span>
              </div>
            ))}
          </div>
        </div>

        {/* PT Commissions */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Hoa hồng PT</h3>
          <div className="space-y-3">
            {ptCommissions.map(pt => (
              <div key={pt.name} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-zinc-300">{pt.name}</span>
                <span className="text-emerald-500 font-bold">{pt.total.toLocaleString()}đ</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Debt */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold text-white mb-4">Công nợ khách hàng</h3>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[200px]">
              {debtList.map((debt, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-zinc-300 text-sm">{debt.name}</span>
                  <span className="text-red-400 font-bold text-sm">{debt.debt.toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400">Tổng nợ</span>
              <span className="text-red-500 font-bold text-xl">{totalDebt.toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Biểu đồ doanh thu</h3>
            <button className="text-zinc-400 hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 flex flex-col"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Phân bổ gói tập</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={packageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {packageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {packageData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs text-zinc-400">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Data Grid / Recent Activity */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Giao dịch gần đây</h3>
          <button className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">Xem tất cả</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Mã GD</th>
                <th className="p-4 font-medium">Học viên</th>
                <th className="p-4 font-medium">Gói tập</th>
                <th className="p-4 font-medium">Số tiền</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-800/50">
              {recentTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 font-mono text-zinc-300">{trx.id}</td>
                  <td className="p-4 text-white font-medium">{trx.user}</td>
                  <td className="p-4 text-zinc-400">{trx.package}</td>
                  <td className="p-4 text-white font-mono">{trx.amount}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      trx.status === 'Thành công' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {trx.status}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-500 text-xs">{trx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

// --- Subcomponents ---

function KPICard({ title, value, trend, isPositive, icon }: { title: string, value: string, trend: string, isPositive: boolean, icon: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 flex flex-col relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50 group-hover:bg-zinc-800 transition-colors">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
        }`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-zinc-400 text-sm font-medium mb-1">{title}</h4>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
      
      {/* Decorative background gradient */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-zinc-800/0 to-zinc-800/50 rounded-full blur-2xl pointer-events-none"></div>
    </motion.div>
  );
}
