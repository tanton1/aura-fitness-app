import React, { useState, useEffect, useMemo } from 'react';
import { Student, StudentContract, PaymentRecord, Installment, UserProfile } from '../../types';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DollarSign, TrendingUp, AlertCircle, Plus, CheckCircle, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DateRangeFilter from './DateRangeFilter';

interface Props {
  user: User | null;
  profile: UserProfile | null;
}

export default function FinanceManagement({ user, profile }: Props) {
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date } | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedContract, setSelectedContract] = useState<StudentContract | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installments, setInstallments] = useState<{date: string, amount: number}[]>([]);

  useEffect(() => {
    if (!selectedContract || !isPaying) {
      setInstallments([]);
      return;
    }
    const remainingDebt = selectedContract.totalPrice - selectedContract.paidAmount - (Number(payAmount) || 0);
    if (remainingDebt > 0) {
      const base = Math.floor(remainingDebt / installmentCount);
      const rem = remainingDebt % installmentCount;
      setInstallments(prev => Array.from({ length: installmentCount }).map((_, i) => ({
        date: prev[i]?.date || '',
        amount: i === 0 ? base + rem : base
      })));
    } else {
      setInstallments([]);
    }
  }, [payAmount, installmentCount, selectedContract, isPaying]);

  const handleInstallmentChange = (index: number, field: 'date' | 'amount', value: string | number) => {
    const newInsts = [...installments];
    newInsts[index] = { ...newInsts[index], [field]: value };
    setInstallments(newInsts);
  };

  const filteredContracts = useMemo(() => {
    if (profile?.branchId && profile.role !== 'admin') {
      return contracts.filter(c => c.branchId === profile.branchId);
    }
    return contracts;
  }, [contracts, profile]);

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    if (profile?.branchId && profile.role !== 'admin') {
      filtered = filtered.filter(p => {
        const contract = contracts.find(c => c.id === p.contractId);
        return contract?.branchId === profile.branchId;
      });
    }
    if (dateRange) {
      filtered = filtered.filter(p => {
        const pDate = new Date(p.date);
        return pDate >= dateRange.start && pDate <= dateRange.end;
      });
    }
    return filtered;
  }, [payments, dateRange]);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'schedules', 'global_schedule');
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContracts(data.contracts || []);
          setStudents(data.students || []);
          setPayments(data.payments || []);
        }
      });
      return () => unsub();
    }
  }, [user]);

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDebt = filteredContracts.reduce((sum, c) => sum + (c.totalPrice - c.paidAmount), 0);
  const contractsWithDebt = filteredContracts.filter(c => c.totalPrice > c.paidAmount);

  const handlePayment = async () => {
    if (!selectedContract || !payAmount) return;
    const amount = Number(payAmount);
    if (amount <= 0) return;
    
    const remainingDebt = selectedContract.totalPrice - selectedContract.paidAmount - amount;
    let finalInstallments: Installment[] = [];
    
    if (remainingDebt > 0) {
      const sum = installments.reduce((a, b) => a + b.amount, 0);
      if (sum !== remainingDebt) {
        alert('Tổng số tiền các kỳ phải bằng số tiền còn nợ!');
        return;
      }
      if (installments.some(i => !i.date)) {
        alert('Vui lòng chọn ngày hẹn trả cho tất cả các kỳ!');
        return;
      }
      finalInstallments = installments.map((inst, idx) => ({
        id: Date.now().toString() + '-' + idx,
        amount: inst.amount,
        date: inst.date,
        status: 'pending'
      }));
    }

    const newPayment: PaymentRecord = {
      id: Date.now().toString(),
      contractId: selectedContract.id,
      studentId: selectedContract.studentId,
      amount: amount,
      date: new Date().toISOString(),
      method: 'transfer',
      note: 'Thanh toán công nợ'
    };

    const updatedContract = {
      ...selectedContract,
      paidAmount: selectedContract.paidAmount + amount,
      installments: finalInstallments,
    };
    
    if (finalInstallments.length > 0) {
      updatedContract.nextPaymentDate = finalInstallments[0].date;
    } else {
      delete updatedContract.nextPaymentDate;
    }

    const newContracts = contracts.map(c => c.id === selectedContract.id ? updatedContract : c);
    const newPayments = [...payments, newPayment];

    setContracts(newContracts);
    setPayments(newPayments);

    if (user) {
      try {
        await setDoc(doc(db, 'schedules', 'global_schedule'), { 
          contracts: newContracts,
          payments: newPayments
        }, { merge: true });
      } catch (e) {
        console.error("Error saving payment:", e);
        alert("Có lỗi khi lưu phiếu thu!");
      }
    }

    setIsPaying(false);
    setSelectedContract(null);
    setPayAmount('');
    setInstallmentCount(1);
    setInstallments([]);
  };

  const getStudentName = (id: string) => {
    return students.find(s => s.id === id)?.name || 'Học viên ẩn';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-medium text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] tracking-tight border-b-4 border-pink-500/30 pb-2 inline-block shadow-[0_6px_0_rgba(236,72,153,0.2)] rounded-2xl">
          Tài chính
        </h1>
        <p className="text-zinc-400 mt-2">Quản lý doanh thu và công nợ</p>
      </div>

      <div className="flex justify-between items-center">
        <DateRangeFilter onFilter={(start, end) => setDateRange({ start, end })} />
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setShowPaymentHistory(true)}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden text-left hover:border-emerald-500/50 transition-colors"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">Đã thu</span>
          </div>
          <p className="text-xl font-bold text-white">
            {totalRevenue.toLocaleString('vi-VN')}đ
          </p>
        </button>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-zinc-400 text-sm font-medium">Công nợ</span>
          </div>
          <p className="text-xl font-bold text-white">
            {totalDebt.toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>

      {/* Debt List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-pink-500" />
          Danh sách cần thu
        </h3>
        
        <div className="space-y-3">
          {contractsWithDebt.length > 0 ? (
            contractsWithDebt.map(contract => {
              const debtAmount = contract.totalPrice - contract.paidAmount;
              const pendingInstallments = contract.installments?.filter(i => i.status === 'pending') || [];
              const nextInstallment = pendingInstallments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
              
              // Fallback to nextPaymentDate if no installments
              const isOverdue = nextInstallment 
                ? new Date(nextInstallment.date) < new Date()
                : (contract.nextPaymentDate && new Date(contract.nextPaymentDate) < new Date());
              
              return (
                <div key={contract.id} className={`bg-zinc-900 border rounded-2xl p-4 flex justify-between items-center shadow-sm transition-colors ${isOverdue ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium">{getStudentName(contract.studentId)}</h4>
                      {isOverdue && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                          Quá hạn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{contract.packageName}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm font-bold text-red-400">Nợ: {debtAmount.toLocaleString('vi-VN')}đ</p>
                      {(nextInstallment || contract.nextPaymentDate) && (
                        <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400 font-medium' : 'text-zinc-500'}`}>
                          <Clock className="w-3 h-3" />
                          Kỳ tiếp: {new Date(nextInstallment?.date || contract.nextPaymentDate!).toLocaleDateString('vi-VN')}
                          {nextInstallment && ` (${nextInstallment.amount.toLocaleString('vi-VN')}đ)`}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedContract(contract);
                      setPayAmount(debtAmount.toString());
                      setIsPaying(true);
                    }}
                    className="p-3 bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-50" />
              <p className="text-zinc-400">Tuyệt vời! Không có công nợ nào.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment History Modal */}
      <AnimatePresence>
        {showPaymentHistory && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowPaymentHistory(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="relative w-full max-w-lg bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Lịch sử phiếu thu</h3>
                <button onClick={() => setShowPaymentHistory(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {payments.length > 0 ? (
                  payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                    <div key={p.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium">{getStudentName(p.studentId)}</p>
                        <p className="text-xs text-zinc-500">{new Date(p.date).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <p className="text-emerald-400 font-bold">{p.amount.toLocaleString('vi-VN')}đ</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-zinc-500 py-10">Chưa có lịch sử thu tiền.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaying && selectedContract && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsPaying(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800"
            >
              <h3 className="text-xl font-bold text-white mb-2">Thanh toán công nợ</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Học viên: <span className="text-white font-medium">{getStudentName(selectedContract.studentId)}</span>
              </p>

              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500">Tổng tiền gói:</span>
                    <span className="text-zinc-300">{selectedContract.totalPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500">Đã thanh toán:</span>
                    <span className="text-zinc-300">{selectedContract.paidAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400">Còn nợ:</span>
                    <span className="text-red-400">{(selectedContract.totalPrice - selectedContract.paidAmount).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Số tiền thanh toán đợt này (VNĐ)</label>
                  <input 
                    type="number" 
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500 text-lg font-bold" 
                  />
                </div>

                {Number(payAmount) < (selectedContract.totalPrice - selectedContract.paidAmount) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl space-y-4"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Số tiền còn nợ sau khi trả:</span>
                      <span className="text-red-400 font-bold">
                        {((selectedContract.totalPrice - selectedContract.paidAmount) - Number(payAmount)).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Số kỳ thanh toán</label>
                      <select 
                        value={installmentCount}
                        onChange={e => setInstallmentCount(Number(e.target.value))}
                        className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-red-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map(n => (
                          <option key={n} value={n}>{n} kỳ</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      {installments.map((inst, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">Hẹn trả kỳ {idx + 1}</label>
                            <input 
                              type="date" 
                              value={inst.date}
                              onChange={e => handleInstallmentChange(idx, 'date', e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-red-500 text-sm" 
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">Số tiền (VNĐ)</label>
                            <input 
                              type="number" 
                              value={inst.amount}
                              onChange={e => handleInstallmentChange(idx, 'amount', Number(e.target.value))}
                              className="w-full p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-red-500 text-sm" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsPaying(false)}
                    className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handlePayment}
                    disabled={!payAmount || Number(payAmount) <= 0}
                    className="flex-1 py-3 rounded-xl font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  >
                    Xác nhận thu
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
