import React, { useState, useEffect, useMemo } from 'react';
import { Student, UserProfile, StudentContract, TrainingPackage, Trainer, Branch, Session, PaymentRecord } from '../../types';
import { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../../firebase-applet-config.json';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { Search, Plus, Edit2, Trash2, Phone, Mail, Calendar, CheckCircle, XCircle, AlertCircle, User as UserIcon, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StudentDetail from './StudentDetail';
import DateRangeFilter from './DateRangeFilter';

interface Props {
  user: User | null;
  profile: UserProfile | null;
}

export default function StudentManagement({ user, profile }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    phone: '',
    email: '',
    dob: '',
    sessionsPerWeek: 3,
    availableSlots: [],
    status: 'active',
    branchId: '',
  });

  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.phone && s.phone.includes(searchTerm))
    );

    // Filter by branch
    if (selectedBranchId !== 'all') {
      if (selectedBranchId === 'none') {
        filtered = filtered.filter(s => !s.branchId || s.branchId === '');
      } else {
        filtered = filtered.filter(s => s.branchId === selectedBranchId);
      }
    } else if (profile?.branchId && profile.role !== 'admin') {
      filtered = filtered.filter(s => s.branchId === profile.branchId);
    }

    if (dateRange) {
      filtered = filtered.filter(s => {
        if (!s.joinDate) return false;
        const joinDate = new Date(s.joinDate);
        return joinDate >= dateRange.start && joinDate <= dateRange.end;
      });
    }
    return filtered;
  }, [students, searchTerm, dateRange, selectedBranchId, profile]);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'schedules', 'global_schedule');
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStudents(data.students || []);
          setContracts(data.contracts || []);
          setPayments(data.payments || []);
          setTrainers(data.trainers || []);
          setBranches(data.branches || []);
          setSessions(data.sessions || []);
          
          if (!data.packages || data.packages.length === 0) {
            setPackages([
              { id: 'p1', name: 'Gói 12 buổi', totalSessions: 12, price: 4200000, durationMonths: 1 },
              { id: 'p2', name: 'Gói 36 buổi', totalSessions: 36, price: 10800000, durationMonths: 3 }
            ]);
          } else {
            setPackages(data.packages);
          }
        }
      });
      return () => unsub();
    }
  }, [user]);

  const saveToFirebase = async (newStudents: Student[]) => {
    if (user) {
      try {
        await setDoc(doc(db, 'schedules', 'global_schedule'), { students: JSON.parse(JSON.stringify(newStudents)) }, { merge: true });
      } catch (e) {
        console.error("Error saving students:", e);
        setAlertMessage("Lỗi lưu dữ liệu học viên: " + (e as Error).message);
      }
    }
  };

  const handleSaveContract = async (newContract: StudentContract) => {
    try {
      if (newContract.trainerId) {
        const trainer = trainers.find(t => t.id === newContract.trainerId);
        if (trainer) {
          const commission = newContract.totalPrice * (trainer.commissionRate / 100);
          console.log(`Commission for ${trainer.name}: ${commission}`);
        }
      }

      const student = students.find(s => s.id === newContract.studentId);
      let updatedStudents = students;
      if (student && student.status !== 'active') {
        updatedStudents = students.map(s => s.id === student.id ? { ...s, status: 'active' } : s);
        setStudents(updatedStudents);
      }

      const newContracts = [...contracts, newContract];
      setContracts(newContracts);

      let newPayments = payments;
      if (newContract.paidAmount > 0) {
        const payment: PaymentRecord = {
          id: Date.now().toString() + '-p',
          contractId: newContract.id,
          studentId: newContract.studentId,
          amount: newContract.paidAmount,
          date: new Date().toISOString(),
          method: 'transfer',
          note: 'Thanh toán lần đầu khi đăng ký gói'
        };
        newPayments = [...payments, payment];
        setPayments(newPayments);
      }

      if (user) {
        await setDoc(doc(db, 'schedules', 'global_schedule'), { 
          contracts: newContracts,
          students: updatedStudents,
          payments: newPayments
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error saving contract:", e);
      setAlertMessage("Lỗi lưu hợp đồng: " + (e as Error).message);
    }
  };

  const handleUpdateContract = async (updatedContract: StudentContract) => {
    try {
      const oldContract = contracts.find(c => c.id === updatedContract.id);
      const newContracts = contracts.map(c => c.id === updatedContract.id ? updatedContract : c);
      setContracts(newContracts);
      
      let newPayments = payments;
      if (oldContract && updatedContract.paidAmount > oldContract.paidAmount) {
        const diff = updatedContract.paidAmount - oldContract.paidAmount;
        const payment: PaymentRecord = {
          id: Date.now().toString() + '-p',
          contractId: updatedContract.id,
          studentId: updatedContract.studentId,
          amount: diff,
          date: new Date().toISOString(),
          method: 'transfer',
          note: 'Thanh toán thêm (cập nhật hợp đồng)'
        };
        newPayments = [...payments, payment];
        setPayments(newPayments);
      }

      if (user) {
        await setDoc(doc(db, 'schedules', 'global_schedule'), { 
          contracts: newContracts,
          payments: newPayments
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error updating contract:", e);
      setAlertMessage("Lỗi cập nhật hợp đồng: " + (e as Error).message);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;
    setError(null);

    const isDuplicatePhone = students.some(s => 
      s.phone && formData.phone && s.phone === formData.phone && s.id !== editingStudent?.id
    );
    const isDuplicateEmail = students.some(s => 
      s.email && formData.email && s.email === formData.email && s.id !== editingStudent?.id
    );

    if (isDuplicatePhone) {
      setError("Số điện thoại này đã tồn tại trong hệ thống.");
      return;
    }
    if (isDuplicateEmail) {
      setError("Email này đã tồn tại trong hệ thống.");
      return;
    }

    const sanitize = (obj: any) => {
      const newObj = { ...obj };
      Object.keys(newObj).forEach(key => {
        if (newObj[key] === undefined) {
          newObj[key] = null;
        }
      });
      return newObj;
    };

    const currentStudents = [...students];
    let finalStudents: Student[] = [];
    
    if (editingStudent) {
      finalStudents = currentStudents.map(s => s.id === editingStudent.id ? sanitize({ ...s, ...formData }) as Student : s);
    } else {
      let studentId = Date.now().toString();
      if (formData.phone) {
        try {
          const email = formData.email || `${formData.phone}@aurafitness.com`;
          const password = formData.phone;
          
          if (password.length < 6) {
            console.warn("Phone number too short for password, skipping auth creation");
          } else {
            const secondaryApp = getApps().length > 1 ? getApp("Secondary") : initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            studentId = userCred.user.uid;
            await secondaryAuth.signOut();
          }
        } catch (e: any) {
          console.error("Error creating auth user:", e);
        }
      }

      const newStudent: Student = {
        id: studentId,
        name: formData.name,
        phone: formData.phone || '',
        email: formData.email || (formData.phone ? `${formData.phone}@aurafitness.com` : ''),
        dob: formData.dob || '',
        sessionsPerWeek: formData.sessionsPerWeek || 3,
        availableSlots: formData.availableSlots || [],
        status: formData.status || 'active',
        joinDate: new Date().toISOString().split('T')[0],
        branchId: formData.branchId || profile?.branchId || '',
      };
      
      finalStudents = [...students, newStudent];
    }

    setStudents(finalStudents);
    await saveToFirebase(finalStudents);
    setIsAdding(false);
    setEditingStudent(null);
    setFormData({ name: '', phone: '', email: '', dob: '', sessionsPerWeek: 3, availableSlots: [], status: 'active', branchId: '' });
    setError(null);
  };

  const handleDelete = (id: string) => {
    setStudentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!studentToDelete) return;
    
    const id = studentToDelete;
    const newStudents = students.filter(s => s.id !== id);
    const newContracts = contracts.filter(c => c.studentId !== id);
    const newPayments = payments.filter(p => p.studentId !== id);
    const newSessions = sessions.filter(s => s.studentId !== id);
    
    setStudents(newStudents);
    setContracts(newContracts);
    setPayments(newPayments);
    setSessions(newSessions);
    
    if (user) {
      try {
        await setDoc(doc(db, 'schedules', 'global_schedule'), { 
          students: newStudents,
          contracts: newContracts,
          payments: newPayments,
          sessions: newSessions
        }, { merge: true });
        setAlertMessage("Đã xóa học viên thành công!");
      } catch (e) {
        console.error("Error deleting student data:", e);
        setAlertMessage("Lỗi xóa dữ liệu học viên: " + (e as Error).message);
      }
    }
    
    setShowDeleteConfirm(false);
    setStudentToDelete(null);
  };

  if (selectedStudentId) {
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      return (
        <StudentDetail
          student={student}
          contracts={contracts}
          packages={packages}
          trainers={trainers}
          branches={branches}
          sessions={sessions}
          onBack={() => setSelectedStudentId(null)}
          onSaveContract={handleSaveContract}
          onUpdateContract={handleUpdateContract}
        />
      );
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-medium text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] tracking-tight border-b-4 border-pink-500/30 pb-2 inline-block shadow-[0_6px_0_rgba(236,72,153,0.2)] rounded-2xl">
          Học viên
        </h1>
        <p className="text-zinc-400 mt-2">Quản lý danh sách học viên và hợp đồng</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm tên, SĐT học viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          <select 
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-3 rounded-xl focus:outline-none focus:border-pink-500"
          >
            <option value="all">Tất cả chi nhánh</option>
            <option value="none">Chưa xác định</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            onClick={() => {
              setEditingStudent(null);
              setFormData({ name: '', phone: '', email: '', dob: '', sessionsPerWeek: 3, availableSlots: [], status: 'active', branchId: '' });
              setError(null);
              setIsAdding(true);
            }}
            className="bg-pink-500 text-white px-4 py-3 rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(255,0,127,0.4)]"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline ml-2 font-medium">Thêm mới</span>
          </button>
        </div>
        <DateRangeFilter onFilter={(start, end) => setDateRange({ start, end })} />
      </div>

          <div className="space-y-3">
            {filteredStudents.map(student => {
              const hasOverdueDebt = contracts.some(c => {
                if (c.studentId !== student.id) return false;
                const pending = c.installments?.filter(i => i.status === 'pending') || [];
                if (pending.length === 0 && c.nextPaymentDate && c.paidAmount < c.totalPrice && new Date(c.nextPaymentDate) <= new Date()) {
                  return true;
                }
                return pending.some(i => new Date(i.date) <= new Date());
              });

              return (
              <div key={student.id} className={`bg-zinc-900 border rounded-2xl p-4 shadow-sm transition-colors ${hasOverdueDebt ? 'border-red-500/30' : 'border-zinc-800'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                      {student.name}
                      {student.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-500" />
                      )}
                      {hasOverdueDebt && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                          <AlertCircle className="w-3 h-3" />
                          Nợ quá hạn
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-col gap-1 mt-2 text-sm text-zinc-400">
                      {student.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" />
                          {student.phone}
                        </div>
                      )}
                      {student.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" />
                          {student.email}
                        </div>
                      )}
                      {student.dob && !isNaN(new Date(student.dob).getTime()) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(student.dob).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {student.sessionsPerWeek} buổi/tuần
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingStudent(student);
                        setFormData(student);
                        setError(null);
                        setIsAdding(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">
                    Tham gia: {student.joinDate && !isNaN(new Date(student.joinDate).getTime()) ? new Date(student.joinDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                  <button 
                    onClick={() => setSelectedStudentId(student.id)}
                    className="text-xs font-medium text-pink-500 hover:text-pink-400 transition-colors"
                  >
                    Xem chi tiết & Gói tập &rarr;
                  </button>
                </div>
              </div>
              );
            })}

            {filteredStudents.length === 0 && (
              <div className="text-center py-10 text-zinc-500">
                Không tìm thấy học viên nào.
              </div>
            )}
          </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div key="add-edit-modal" className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-white mb-6">
                {editingStudent ? 'Sửa thông tin học viên' : 'Thêm học viên mới'}
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Tên học viên *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Số điện thoại</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    placeholder="VD: 0987654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    placeholder="VD: email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Ngày sinh</label>
                  <input 
                    type="date" 
                    value={formData.dob || ''}
                    onChange={e => setFormData({...formData, dob: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Cơ sở (Không bắt buộc)</label>
                  <select 
                    value={formData.branchId || ''}
                    onChange={e => setFormData({...formData, branchId: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="">-- Tất cả cơ sở --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Số buổi/tuần</label>
                    <input 
                      type="number" 
                      value={formData.sessionsPerWeek}
                      onChange={e => setFormData({...formData, sessionsPerWeek: Number(e.target.value)})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                      min="1" max="7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Trạng thái</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
                    >
                      <option value="active">Đang tập</option>
                      <option value="inactive">Đã nghỉ</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.name}
                    className="flex-1 py-3 rounded-xl font-medium text-white bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]"
                  >
                    Lưu thông tin
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div key="delete-confirm" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-red-500/30 text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Xác nhận xóa</h3>
              <p className="text-zinc-400 mb-6">
                Bạn có chắc chắn muốn xóa học viên này? Thao tác này sẽ xóa toàn bộ hợp đồng, lịch sử thanh toán và buổi tập của học viên.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  Đồng ý xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Modal */}
      <AnimatePresence>
        {alertMessage && (
          <div key="alert-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setAlertMessage(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800 text-center"
            >
              <div className="w-16 h-16 bg-pink-500/20 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-white font-medium mb-6">{alertMessage}</p>
              <button 
                onClick={() => setAlertMessage(null)}
                className="w-full py-3 rounded-xl font-medium text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
