import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Building2
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
import { Session, Trainer, StudentContract, Student, PaymentRecord, Branch } from '../../types';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AdminReportDashboard() {
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'pt'>('overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

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
        setBranches(data.branches || []);
      }
    });
    return () => unsub();
  }, []);

  // Filter data by branch
  const filterByBranch = (items: any[]) => {
    if (selectedBranchId === 'all') return items;
    if (selectedBranchId === 'none') return items.filter(item => !item.branchId);
    return items.filter(item => item.branchId === selectedBranchId);
  };

  const filteredSessions = filterByBranch(sessions);
  const filteredTrainers = selectedBranchId === 'all' ? trainers : (selectedBranchId === 'none' ? trainers.filter(t => !t.branchId) : trainers.filter(t => t.branchId === selectedBranchId));
  const filteredContracts = filterByBranch(contracts);
  const filteredStudents = filterByBranch(students);
  
  // Generate missing payments from contracts
  const allPayments = [...payments];
  contracts.forEach(c => {
    const totalPaidForContract = payments
      .filter(p => p.contractId === c.id)
      .reduce((sum, p) => sum + p.amount, 0);
    
    if (c.paidAmount > totalPaidForContract) {
      allPayments.push({
        id: `auto-${c.id}`,
        contractId: c.id,
        studentId: c.studentId,
        amount: c.paidAmount - totalPaidForContract,
        date: c.startDate ? new Date(c.startDate).toISOString() : new Date().toISOString(),
        method: 'transfer',
        note: 'Thanh toán (tự động tạo - phần chênh lệch)'
      });
    }
  });

  const filteredPayments = allPayments.filter(p => {
    const contract = contracts.find(c => c.id === p.contractId);
    const branchId = contract?.branchId || undefined;
    
    // Debug log
    if (!branchId) {
      console.log("Payment with undefined branch:", p, "Contract:", contract);
    }
    
    const selectedId = selectedBranchId === 'none' ? undefined : selectedBranchId;
    const inBranch = selectedBranchId === 'all' || branchId === selectedId;
    
    // Filter by timeRange
    const pDate = new Date(p.date);
    const now = new Date();
    let inTimeRange = true;
    if (timeRange === '7days') {
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      inTimeRange = pDate >= sevenDaysAgo;
    } else if (timeRange === '30days') {
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      inTimeRange = pDate >= thirtyDaysAgo;
    } else if (timeRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      inTimeRange = pDate >= startOfYear;
    }

    return inBranch && inTimeRange;
  });

  const filteredStudentsForKPI = filteredStudents.filter(s => {
    if (!s.joinDate) return false;
    const sDate = new Date(s.joinDate);
    const now = new Date();
    if (timeRange === '7days') {
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      return sDate >= sevenDaysAgo;
    } else if (timeRange === '30days') {
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      return sDate >= thirtyDaysAgo;
    } else if (timeRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return sDate >= startOfYear;
    }
    return true;
  });

  useEffect(() => {
    console.log("Payments data:", payments);
    console.log("Contracts data:", contracts);
    console.log("All payments (including auto):", allPayments);
    console.log("Filtered payments:", filteredPayments);
    console.log("Total revenue:", filteredPayments.reduce((sum, p) => sum + p.amount, 0));
  }, [payments, contracts, filteredPayments]);

  // PT Sessions Report
  const ptSessions = filteredTrainers.map(t => {
    const sessionsInTimeRange = filteredSessions.filter(s => {
      if (s.trainerId !== t.id || s.status !== 'completed' || !s.verifiedByStudent) return false;
      const sDate = new Date(s.date);
      const now = new Date();
      if (timeRange === '7days') return sDate >= new Date(now.setDate(now.getDate() - 7));
      if (timeRange === '30days') return sDate >= new Date(now.setDate(now.getDate() - 30));
      if (timeRange === 'year') return sDate >= new Date(now.getFullYear(), 0, 1);
      return true;
    });
    return { name: t.name, count: sessionsInTimeRange.length };
  });

  // PT Commission Report
  const ptCommissions = filteredTrainers.map(t => {
    const sessionsInTimeRange = filteredSessions.filter(s => {
      if (s.trainerId !== t.id || s.status !== 'completed' || !s.verifiedByStudent) return false;
      const sDate = new Date(s.date);
      const now = new Date();
      if (timeRange === '7days') return sDate >= new Date(now.setDate(now.getDate() - 7));
      if (timeRange === '30days') return sDate >= new Date(now.setDate(now.getDate() - 30));
      if (timeRange === 'year') return sDate >= new Date(now.getFullYear(), 0, 1);
      return true;
    });
    const sessionComm = sessionsInTimeRange.length * (t.commissionPerSession || 0);
    
    const referralContractsInTimeRange = filteredContracts.filter(c => {
      if (c.referralCode !== t.employeeCode) return false;
      const cDate = new Date(c.startDate || new Date());
      const now = new Date();
      if (timeRange === '7days') return cDate >= new Date(now.setDate(now.getDate() - 7));
      if (timeRange === '30days') return cDate >= new Date(now.setDate(now.getDate() - 30));
      if (timeRange === 'year') return cDate >= new Date(now.getFullYear(), 0, 1);
      return true;
    });
    const referralComm = referralContractsInTimeRange.reduce((s, c) => s + (c.referralCommission || 0), 0);
    
    return { name: t.name, total: sessionComm + referralComm };
  });

  // Customer Debt Report
  const totalDebt = filteredContracts.reduce((sum, c) => sum + (c.totalPrice - c.paidAmount), 0);
  const debtList = filteredContracts
    .filter(c => c.totalPrice > c.paidAmount)
    .map(c => ({
      name: students.find(s => s.id === c.studentId)?.name || 'Học viên ẩn (Đã xóa)',
      debt: c.totalPrice - c.paidAmount
    }));

  // Revenue Data based on timeRange
  const revenueData = useMemo(() => {
    const now = new Date();
    if (timeRange === 'year') {
      return Array.from({ length: 12 }).map((_, i) => {
        const month = i;
        const total = filteredPayments.filter(p => {
          const d = new Date(p.date);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === month;
        }).reduce((sum, p) => sum + p.amount, 0);
        return { name: `T${month + 1}`, total };
      });
    } else {
      const days = timeRange === '30days' ? 30 : 7;
      return Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().split('T')[0];
        const total = filteredPayments
          .filter(p => p.date.startsWith(dateStr))
          .reduce((sum, p) => sum + p.amount, 0);
        return { 
          name: days === 7 ? d.toLocaleDateString('vi-VN', { weekday: 'short' }) : `${d.getDate()}/${d.getMonth() + 1}`, 
          total 
        };
      });
    }
  }, [timeRange, filteredPayments]);

  // Package Distribution
  const packageData = Object.entries(filteredContracts.filter(c => {
    const cDate = new Date(c.startDate || new Date());
    const now = new Date();
    if (timeRange === '7days') return cDate >= new Date(now.setDate(now.getDate() - 7));
    if (timeRange === '30days') return cDate >= new Date(now.setDate(now.getDate() - 30));
    if (timeRange === 'year') return cDate >= new Date(now.getFullYear(), 0, 1);
    return true;
  }).reduce((acc, c) => {
    acc[c.packageName] = (acc[c.packageName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  // Recent Transactions
  const recentTransactions = filteredPayments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      user: students.find(s => s.id === p.studentId)?.name || 'Học viên ẩn (Đã xóa)',
      package: filteredContracts.find(c => c.id === p.contractId)?.packageName || 'N/A',
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
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'overview' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('pt')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'pt' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
            }`}
          >
            Báo cáo PT
          </button>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <select 
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-transparent text-zinc-300 text-xs font-medium px-2 py-1.5 rounded-md focus:outline-none"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="none">Chưa phân chi nhánh</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
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

      {activeTab === 'overview' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KPICard 
              title="Tổng doanh thu" 
              value={filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('vi-VN') + 'đ'}
              trend="+12.5%" 
              isPositive={true} 
              icon={<DollarSign className="w-5 h-5 text-emerald-500" />} 
            />
            <KPICard 
              title="Học viên mới" 
              value={filteredStudentsForKPI.length.toString()} 
              trend="+8.2%" 
              isPositive={true} 
              icon={<Users className="w-5 h-5 text-indigo-500" />} 
            />
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
        </>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Báo cáo hiệu suất PT</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/80 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium rounded-tl-xl">Tên PT</th>
                  <th className="p-4 font-medium text-center">Số buổi dạy</th>
                  <th className="p-4 font-medium text-right rounded-tr-xl">Tổng hoa hồng</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/50">
                {filteredTrainers.map(t => {
                  const sessionCount = ptSessions.find(s => s.name === t.name)?.count || 0;
                  const commission = ptCommissions.find(c => c.name === t.name)?.total || 0;
                  return (
                    <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-4 text-white font-medium">{t.name}</td>
                      <td className="p-4 text-pink-500 font-bold text-center">{sessionCount} buổi</td>
                      <td className="p-4 text-emerald-500 font-bold text-right">{commission.toLocaleString('vi-VN')}đ</td>
                    </tr>
                  );
                })}
                {filteredTrainers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-500">Không có dữ liệu PT.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
