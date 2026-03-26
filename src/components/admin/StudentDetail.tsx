import React, { useState, useEffect, useCallback } from 'react';
import { Student, StudentContract, TrainingPackage, Installment, Trainer, Branch, Session, DailyCheckin } from '../../types';
import { ArrowLeft, CheckCircle, Plus, Activity, History, FileText, CreditCard, Calendar as CalendarIcon, AlertCircle, TrendingUp, Package, ClipboardCheck, Droplets, Moon, Smile, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ContractInvoice from './ContractInvoice';
import EditContractModal from './EditContractModal';
import StudentProgressAdmin from './StudentProgressAdmin';
import ConfirmationModal from '../ConfirmationModal';
import { useDatabase } from '../../contexts/DatabaseContext';

interface Props {
  student: Student;
  contracts: StudentContract[];
  packages: TrainingPackage[];
  trainers: Trainer[];
  branches: Branch[];
  sessions: Session[];
  onBack: () => void;
  onSaveContract: (contract: StudentContract) => void;
  onUpdateContract: (contract: StudentContract, skipPayment?: boolean) => void;
}

export default function StudentDetail({ student, contracts, packages, trainers, branches, sessions, onBack, onSaveContract, onUpdateContract }: Props) {
  const { dailyCheckins: allDailyCheckins, payments, addPayment, deletePayment } = useDatabase();
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installments, setInstallments] = useState<{date: string, amount: number}[]>([]);
  const [viewingContract, setViewingContract] = useState<StudentContract | null>(null);
  const [editingContract, setEditingContract] = useState<StudentContract | null>(null);
  const [isManagingDebt, setIsManagingDebt] = useState(false);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'progress' | 'history' | 'checkin'>('info');
  const [dailyCheckins, setDailyCheckins] = useState<DailyCheckin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const activeContract = contracts.find(c => c.studentId === student.id && (c.status === 'active' || c.status === 'frozen'));
  const historyContracts = contracts.filter(c => c.studentId === student.id && c.status !== 'active' && c.status !== 'frozen');
  const studentSessions = sessions.filter(s => s.studentId === student.id);

  useEffect(() => {
    if (activeTab === 'checkin') {
      setLoadingCheckins(true);
      const checkins = allDailyCheckins
        .filter(c => c.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDailyCheckins(checkins);
      setLoadingCheckins(false);
    }
  }, [activeTab, student.id, allDailyCheckins]);

  useEffect(() => {
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (!pkg) {
      setInstallments([]);
      setEndDate('');
      return;
    }
    
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + pkg.durationMonths * 30 * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().split('T')[0]);
    }

    const discountAmount = Number(discount) || 0;
    const debt = (pkg.price - discountAmount) - (Number(paidAmount) || 0);
    if (debt > 0) {
      const base = Math.floor(debt / installmentCount);
      const rem = debt % installmentCount;
      setInstallments(prev => Array.from({ length: installmentCount }).map((_, i) => ({
        date: prev[i]?.date || '',
        amount: i === 0 ? base + rem : base
      })));
    } else {
      setInstallments([]);
    }
  }, [installmentCount, paidAmount, discount, selectedPackageId, packages, startDate]);

  const handleInstallmentChange = (index: number, field: 'date' | 'amount', value: string | number) => {
    const newInsts = [...installments];
    newInsts[index] = { ...newInsts[index], [field]: value };
    setInstallments(newInsts);
  };

  const handleCheckIn = () => {
    if (!activeContract) return;
    if (activeContract.status === 'frozen') {
      alert('Hợp đồng đang bảo lưu, không thể điểm danh!');
      return;
    }
    if (activeContract.usedSessions >= activeContract.totalSessions) {
      alert('Gói tập đã hết buổi!');
      return;
    }
    
    const updated = {
      ...activeContract,
      usedSessions: activeContract.usedSessions + 1,
      status: (activeContract.usedSessions + 1) >= activeContract.totalSessions ? 'expired' : 'active'
    } as StudentContract;
    
    onUpdateContract(updated);
  };

  const handleRegisterPackage = () => {
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (!pkg) {
      alert('Vui lòng chọn gói tập!');
      return;
    }

    const amountPaid = Number(paidAmount) || 0;
    const discountAmount = Number(discount) || 0;
    const debt = (pkg.price - discountAmount) - amountPaid;
    let finalInstallments: Installment[] = [];

    // Calculate referral commission if code is valid
    let referralCommissionAmount = 0;
    if (referralCode) {
      const referringPT = trainers.find(t => t.employeeCode === referralCode);
      if (referringPT) {
        referralCommissionAmount = pkg.price * (referringPT.commissionRate / 100);
      }
    }

    if (debt > 0) {
      const sum = installments.reduce((a, b) => a + b.amount, 0);
      if (sum !== debt) {
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

    const newContract: StudentContract = {
      id: Date.now().toString(),
      studentId: student.id,
      trainerId: selectedTrainerId,
      branchId: selectedBranchId,
      packageId: pkg.id,
      packageName: pkg.name,
      startDate: startDate,
      endDate: endDate,
      totalSessions: pkg.totalSessions,
      usedSessions: 0,
      totalPrice: pkg.price,
      paidAmount: amountPaid,
      discount: discountAmount,
      status: 'active',
      installments: finalInstallments,
      referralCode: referralCode || null,
      referralCommission: referralCommissionAmount || null,
    };
    
    if (finalInstallments.length > 0) {
      newContract.nextPaymentDate = finalInstallments[0].date;
    }

    onSaveContract(newContract);
    setIsAddingPackage(false);
    setSelectedPackageId('');
    setSelectedTrainerId('');
    setSelectedBranchId('');
    setReferralCode('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setPaidAmount('');
    setDiscount('');
    setInstallmentCount(1);
    setInstallments([]);
  };

  const handlePayInstallment = (contractId: string, installmentId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract || !contract.installments) return;

    const installmentToPay = contract.installments.find(i => i.id === installmentId);
    if (!installmentToPay) return;

    setConfirmAction({
      title: 'Xác nhận thu tiền',
      message: `Xác nhận thu tiền kỳ này: ${installmentToPay.amount.toLocaleString('vi-VN')}đ?`,
      onConfirm: () => {
        const updatedInstallments = contract.installments!.map(inst => 
          inst.id === installmentId ? { ...inst, status: 'paid' as const } : inst
        );

        const newPaidAmount = contract.paidAmount + installmentToPay.amount;
        
        // Find next pending installment date
        const nextPending = updatedInstallments.find(i => i.status === 'pending');

        const updatedContract = {
          ...contract,
          installments: updatedInstallments,
          paidAmount: newPaidAmount,
          nextPaymentDate: nextPending ? nextPending.date : undefined
        };

        onUpdateContract(updatedContract, true);
        
        // Create a payment record
        addPayment({
          id: Date.now().toString(),
          studentId: student.id,
          contractId: contract.id,
          amount: installmentToPay.amount,
          date: new Date().toISOString(),
          method: 'transfer', // Default method
          note: `Thanh toán trả góp hợp đồng ${contract.id}`,
          previousInstallments: contract.installments,
          installmentId: installmentId
        });

        setConfirmAction(null);
        setNotification({message: 'Đã thu tiền thành công!', type: 'success'});
      }
    });
  };

  const handleUndoInstallment = (contractId: string, installmentId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract || !contract.installments) return;

    const installmentToUndo = contract.installments.find(i => i.id === installmentId);
    if (!installmentToUndo) return;

    setConfirmAction({
      title: 'Xác nhận hoàn tác',
      message: `Xác nhận hoàn tác thu tiền kỳ này: ${installmentToUndo.amount.toLocaleString('vi-VN')}đ? Số tiền đã thu sẽ bị trừ đi và phiếu thu tương ứng sẽ bị xóa.`,
      onConfirm: () => {
        const updatedInstallments = contract.installments!.map(inst => 
          inst.id === installmentId ? { ...inst, status: 'pending' as const } : inst
        );

        const newPaidAmount = Math.max(0, contract.paidAmount - installmentToUndo.amount);
        
        // Find next pending installment date
        const nextPending = updatedInstallments.find(i => i.status === 'pending');

        const updatedContract = {
          ...contract,
          installments: updatedInstallments,
          paidAmount: newPaidAmount,
          nextPaymentDate: nextPending ? nextPending.date : undefined
        };

        onUpdateContract(updatedContract, true);
        
        // Find and delete the associated payment record
        const paymentToDelete = payments.find(p => p.contractId === contract.id && p.installmentId === installmentId);
        if (paymentToDelete) {
          deletePayment(paymentToDelete.id);
        }

        setConfirmAction(null);
        setNotification({message: 'Đã hoàn tác thu tiền thành công!', type: 'success'});
      }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-2 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Quay lại danh sách
      </button>
      
      {confirmAction && (
        <ConfirmationModal
          isOpen={!!confirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-xl shadow-lg z-[100] ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.message}
        </div>
      )}

      {/* Student Info */}
      <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
        <h2 className="text-2xl font-bold text-white mb-1">{student.name}</h2>
        <p className="text-zinc-400 text-sm">
          {student.phone || 'Chưa có SĐT'} • {student.email || 'Chưa có Email'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'info' 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Thông tin & Gói tập
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'progress' 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Tiến độ cơ thể
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history' 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <History className="w-4 h-4" />
          Lịch sử tập
        </button>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'checkin' 
              ? 'bg-zinc-800 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Check-in
        </button>
      </div>

      {activeTab === 'progress' ? (
        <StudentProgressAdmin studentId={student.id} />
      ) : activeTab === 'checkin' ? (
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-pink-500" />
            Lịch sử Check-in cuối ngày
          </h3>
          
          {loadingCheckins ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : dailyCheckins.length > 0 ? (
            <div className="space-y-4">
              {dailyCheckins.map(checkin => (
                <div key={checkin.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-300 font-bold">{new Date(checkin.date).toLocaleDateString('vi-VN')}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                      checkin.compliance >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                      checkin.compliance >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      Tuân thủ: {checkin.compliance}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Smile className="w-3.5 h-3.5 text-orange-500" />
                      No/Đói: {checkin.hunger}/5
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Zap className="w-3.5 h-3.5 text-blue-500" />
                      Năng lượng: {checkin.energy}/5
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                      Nước: {checkin.waterIntake}L
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      Ngủ: {checkin.sleepQuality}h
                    </div>
                  </div>
                  
                  {checkin.note && (
                    <div className="text-xs text-zinc-500 bg-zinc-900/50 p-2 rounded-lg italic">
                      "{checkin.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">Chưa có dữ liệu check-in.</p>
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-pink-500" />
            Lịch sử tập luyện
          </h3>
          <div className="space-y-3">
            {studentSessions.length > 0 ? studentSessions.sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0)).map(s => {
              const trainer = trainers.find(t => t.id === s.trainerId);
              return (
                <div key={s.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                  <div>
                    <p className="text-zinc-300 font-medium">{s.date && !isNaN(new Date(s.date).getTime()) ? new Date(s.date).toLocaleDateString('vi-VN') : 'N/A'}</p>
                    <p className="text-xs text-zinc-500">PT: {trainer?.name || 'Không xác định'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    s.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 
                    s.status === 'canceled_by_student' ? 'bg-orange-500/10 text-orange-500' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {s.status === 'completed' ? 'Đã hoàn thành' : s.status === 'cancelled' ? 'Đã hủy' : s.status === 'canceled_by_student' ? 'Đã báo nghỉ' : 'Đã lên lịch'}
                  </span>
                </div>
              );
            }) : (
              <p className="text-zinc-500 text-center py-4">Chưa có lịch sử tập luyện.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Active Package */}
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-pink-500" />
            Gói tập hiện tại
          </h3>
          <div className="flex gap-2">
            {activeContract && (
              <button 
                onClick={() => setViewingContract(activeContract)}
                className="text-xs font-medium text-pink-500 hover:text-pink-400 flex items-center gap-1 bg-pink-500/10 px-2 py-1 rounded-lg"
              >
                <FileText className="w-3 h-3" /> Xem HĐ
              </button>
            )}
            {activeContract && (
              <button 
                onClick={() => setEditingContract(activeContract)}
                className="text-xs font-medium text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg"
              >
                Chỉnh sửa
              </button>
            )}
            {activeContract && (
              <button 
                onClick={() => {
                  const isFrozen = activeContract.status === 'frozen';
                  setConfirmAction({
                    title: isFrozen ? 'Xác nhận hủy bảo lưu' : 'Xác nhận bảo lưu',
                    message: isFrozen ? 'Học viên sẽ quay lại tập luyện?' : 'Học viên sẽ được bảo lưu gói tập?',
                    onConfirm: () => {
                      if (isFrozen) {
                        const frozenDuration = new Date().getTime() - new Date(activeContract.frozenAt || activeContract.startDate).getTime();
                        const { frozenAt, ...contractWithoutFrozenAt } = activeContract;
                        const newEndDate = new Date(new Date(activeContract.endDate).getTime() + frozenDuration).toISOString().split('T')[0];
                        onUpdateContract({
                          ...contractWithoutFrozenAt,
                          status: 'active',
                          endDate: newEndDate
                        });
                      } else {
                        onUpdateContract({
                          ...activeContract,
                          status: 'frozen',
                          frozenAt: new Date().toISOString()
                        });
                      }
                      setConfirmAction(null);
                      setNotification({message: isFrozen ? 'Đã hủy bảo lưu!' : 'Đã bảo lưu thành công!', type: 'success'});
                    }
                  });
                }}
                className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-lg ${
                  activeContract.status === 'frozen' 
                    ? 'text-emerald-500 bg-emerald-500/10 hover:text-emerald-400' 
                    : 'text-blue-500 bg-blue-500/10 hover:text-blue-400'
                }`}
              >
                {activeContract.status === 'frozen' ? 'Hủy bảo lưu' : 'Bảo lưu'}
              </button>
            )}
          </div>
        </div>
        
        {activeContract ? (
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center">
              <span className="text-zinc-200 font-medium text-lg">{activeContract.packageName}</span>
              <span className="text-pink-500 font-bold text-xl">{activeContract.usedSessions} / {activeContract.totalSessions}</span>
            </div>
            
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-pink-600 to-pink-400 h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${(activeContract.usedSessions / activeContract.totalSessions) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-sm text-zinc-400 bg-zinc-950/50 p-3 rounded-xl">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500">Hạn sử dụng</span>
                <span className="font-medium text-zinc-300">{activeContract.endDate && !isNaN(new Date(activeContract.endDate).getTime()) ? new Date(activeContract.endDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-zinc-500">Công nợ</span>
                <span className={`font-medium ${activeContract.totalPrice > activeContract.paidAmount ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(activeContract.totalPrice - activeContract.paidAmount).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {activeContract.installments && activeContract.installments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-500" />
                    Lịch thanh toán trả góp
                  </h4>
                  <button 
                    onClick={() => setIsManagingDebt(!isManagingDebt)}
                    className="text-xs text-pink-500 hover:text-pink-400 font-medium"
                  >
                    {isManagingDebt ? 'Đóng' : 'Quản lý'}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {activeContract.installments.map((inst, idx) => {
                    const isOverdue = inst.status === 'pending' && new Date(inst.date) < new Date(new Date().setHours(0,0,0,0));
                    
                    return (
                      <div key={inst.id} className={`flex justify-between items-center text-sm p-3 rounded-xl border ${
                        inst.status === 'paid' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                        isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-950 border-zinc-800/50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            inst.status === 'paid' ? 'bg-emerald-500/20 text-emerald-500' : 
                            isOverdue ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className={`font-medium ${inst.status === 'paid' ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                              {inst.amount.toLocaleString('vi-VN')}đ
                            </p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {inst.date && !isNaN(new Date(inst.date).getTime()) ? new Date(inst.date).toLocaleDateString('vi-VN') : 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {inst.status === 'paid' ? (
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                                <CheckCircle className="w-3 h-3" /> Đã thu
                              </span>
                              {isManagingDebt && (
                                <button 
                                  onClick={() => handleUndoInstallment(activeContract.id, inst.id)}
                                  className="text-xs font-bold bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors shadow-sm"
                                  title="Hoàn tác thu tiền"
                                >
                                  Hoàn tác
                                </button>
                              )}
                            </div>
                          ) : isManagingDebt ? (
                            <button 
                              onClick={() => handlePayInstallment(activeContract.id, inst.id)}
                              className="text-xs font-bold bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
                            >
                              Thu tiền
                            </button>
                          ) : isOverdue ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md">
                              <AlertCircle className="w-3 h-3" /> Quá hạn
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                              Chờ thu
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button 
              onClick={handleCheckIn}
              className="w-full mt-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <CheckCircle className="w-6 h-6" />
              Điểm danh (Trừ 1 buổi)
            </button>
          </div>
        ) : (
          <div className="text-center py-8 relative z-10">
            <p className="text-zinc-500 mb-4">Học viên chưa có gói tập nào đang hoạt động.</p>
            <button 
              onClick={() => setIsAddingPackage(true)}
              className="bg-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-pink-600 transition-all active:scale-95 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,127,0.3)]"
            >
              <Plus className="w-5 h-5" /> Đăng ký gói mới
            </button>
          </div>
        )}
      </div>

      {/* History */}
      {historyContracts.length > 0 && (
        <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-400" />
            Lịch sử gói tập
          </h3>
          <div className="space-y-3">
            {historyContracts.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                <div>
                  <p className="text-zinc-300 font-medium">{c.packageName}</p>
                  <p className="text-xs text-zinc-500">{c.startDate && !isNaN(new Date(c.startDate).getTime()) ? new Date(c.startDate).toLocaleDateString('vi-VN') : 'N/A'} - {c.endDate && !isNaN(new Date(c.endDate).getTime()) ? new Date(c.endDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400">
                    {c.status === 'expired' ? 'Đã hết hạn' : 'Đã hủy'}
                  </span>
                  <button 
                    onClick={() => setViewingContract(c)}
                    className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Add Package Modal */}
      <AnimatePresence>
        {isAddingPackage && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAddingPackage(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800"
            >
              <h3 className="text-xl font-bold text-white mb-6">Đăng ký gói tập mới</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Chọn gói tập</label>
                  <select 
                    value={selectedPackageId}
                    onChange={e => setSelectedPackageId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="">-- Chọn gói --</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.totalSessions} buổi - {p.price.toLocaleString('vi-VN')}đ)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Chọn cơ sở (Không bắt buộc)</label>
                  <select 
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="">-- Tất cả cơ sở --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Chọn PT (Không bắt buộc)</label>
                  <select 
                    value={selectedTrainerId}
                    onChange={e => setSelectedTrainerId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="">-- Bất kỳ PT nào --</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Mã người giới thiệu (Nếu có)</label>
                  <input 
                    type="text" 
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="VD: PT001"
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Giảm giá (VNĐ)</label>
                  <input 
                    type="number" 
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    placeholder="VD: 500000"
                  />
                </div>

                {selectedPackageId && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Ngày bắt đầu</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Ngày kết thúc</label>
                        <input 
                          type="date" 
                          value={endDate}
                          disabled
                          className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Số tiền thanh toán trước (VNĐ)</label>
                      <input 
                        type="number" 
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                        placeholder="VD: 1000000"
                      />
                      <p className="text-xs text-zinc-500 mt-1">Có thể thanh toán một phần hoặc toàn bộ.</p>
                    </div>

                    {Number(paidAmount) < ((packages.find(p => p.id === selectedPackageId)?.price || 0) - (Number(discount) || 0)) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl space-y-4"
                      >
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">Số tiền còn nợ:</span>
                          <span className="text-red-400 font-bold">
                            {((packages.find(p => p.id === selectedPackageId)?.price || 0) - (Number(discount) || 0) - Number(paidAmount)).toLocaleString('vi-VN')}đ
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
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsAddingPackage(false)}
                    className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleRegisterPackage}
                    disabled={!selectedPackageId}
                    className="flex-1 py-3 rounded-xl font-medium text-white bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[80] p-4 rounded-xl shadow-lg border ${
              notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmationModal
          isOpen={!!confirmAction}
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Contract Invoice Modal */}
      <AnimatePresence>
        {viewingContract && (
          <div key="view-contract">
            <ContractInvoice 
              student={student}
              contract={viewingContract}
              onClose={() => setViewingContract(null)}
            />
          </div>
        )}
        {editingContract && (
          <div key="edit-contract">
            <EditContractModal
              contract={editingContract}
              packages={packages}
              trainers={trainers}
              branches={branches}
              onClose={() => setEditingContract(null)}
              onSave={(updatedContract) => {
                onUpdateContract(updatedContract);
                setEditingContract(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
