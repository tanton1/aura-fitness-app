import React, { useState, useEffect } from 'react';
import { Student, Trainer, Schedule, Warning, UserProfile, DAYS, HOURS, StudentContract, Session, ScheduleEntry } from '../types';
import { generateSchedule } from '../utils/scheduler';
import StudentForm from './StudentForm';
import StudentList from './StudentList';
import PTSchedule from './PTSchedule';
import { Calendar, Users, UserPlus, CheckCircle2, Package, User as UserIcon, Phone, Mail, MapPin, CheckCircle, ChevronRight, CreditCard, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getDatesForCurrentWeek, getDatesForWeek, getWeekRange, getMonthRange, isSameDayOrAfter } from '../utils/dateUtils';

interface Props {
  user: User | null;
  profile: UserProfile | null;
}

export default function SchedulerWrapper({ user, profile }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [contracts, setContracts] = useState<StudentContract[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'students' | 'trainers'>('schedule');
  const [studentTab, setStudentTab] = useState<'overview' | 'schedule' | 'profile'>('overview');
  const [weekOffset, setWeekOffset] = useState(0);
  const [studentSessionFilter, setStudentSessionFilter] = useState<'upcoming' | 'history' | 'this_week'>('upcoming');

  const isAdmin = profile?.role === 'admin';
  const isTrainer = profile?.role === 'trainer';

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'schedules', 'global_schedule');
      const unsub = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setStudents((data.students || []).map((s: any) => ({
            ...s, 
            availableSlots: s.availableSlots || []
          })));
          
          // Merge explicit trainers and staff with trainer role
          const explicitTrainers = data.trainers || [];
          const staffTrainers = (data.staff || [])
            .filter((s: any) => s.role === 'trainer')
            .map((s: any) => ({
              ...s,
              commissionRate: s.commissionRate || 0,
              status: s.status || 'active'
            }));
          
          // De-duplicate by ID
          const allTrainersMap = new Map();
          [...explicitTrainers, ...staffTrainers].forEach(t => {
            allTrainersMap.set(t.id, t);
          });
          
          setTrainers(Array.from(allTrainersMap.values()));
          setContracts(data.contracts || []);
          setSessions(data.sessions || []);
          setSchedule(data.schedule || {});
          setWarnings(data.warnings || []);
        }
        setIsLoaded(true);
      }, (error) => {
        console.error("Error fetching schedule:", error);
        setIsLoaded(true);
      });
      return () => unsub();
    } else {
      setIsLoaded(true);
    }
  }, [user]);

  const saveToFirebase = async (newStudents: Student[], newTrainers: Trainer[], newSchedule: Schedule, newWarnings: Warning[]) => {
    if (user) {
      await setDoc(doc(db, 'schedules', 'global_schedule'), {
        students: newStudents,
        trainers: newTrainers,
        schedule: newSchedule,
        warnings: newWarnings
      }, { merge: true });
    }
  };

  const handleGenerate = () => {
    const unconfirmedStudents = students.filter(s => !s.isScheduleConfirmed);
    if (unconfirmedStudents.length > 0) {
      if (!confirm(`Có ${unconfirmedStudents.length} học viên chưa chốt lịch rảnh. Bạn có chắc chắn muốn chạy xếp lịch không?`)) {
        return;
      }
    }
    const result = generateSchedule(students, trainers, contracts);
    setSchedule(result.schedule);
    setWarnings(result.warnings);
    saveToFirebase(students, trainers, result.schedule, result.warnings);
  };

  const handleDeploySchedule = async () => {
    const targetWeekDates = getDatesForWeek(weekOffset);
    const weekLabel = weekOffset === 0 ? 'tuần này' : weekOffset === 1 ? 'tuần sau' : `tuần +${weekOffset}`;
    
    if (!confirm(`Triển khai lịch tập ${weekLabel}? Hệ thống sẽ tạo các buổi tập thực tế dựa trên lịch đã xếp.`)) return;
    
    const newSessions: Session[] = [];
    
    Object.entries(schedule).forEach(([slotId, entries]) => {
      const typedEntries = entries as ScheduleEntry[];
      const [dayCode, hour] = slotId.split('-');
      const dateInfo = targetWeekDates[dayCode];
      if (!dateInfo) return;
      const dateStr = dateInfo.full;

      typedEntries.forEach(entry => {
        const contract = contracts.find(c => c.studentId === entry.studentId && c.status === 'active');
        newSessions.push({
          id: `${slotId}-${entry.studentId}-${dateStr}`,
          trainerId: entry.trainerId,
          studentId: entry.studentId,
          date: dateStr,
          status: 'scheduled',
          branchId: contract?.branchId || trainers.find(t => t.id === entry.trainerId)?.branchId,
          verifiedByStudent: false
        });
      });
    });

    if (user) {
      const allSessions = [...sessions, ...newSessions];
      // Filter out duplicates just in case (by ID)
      const uniqueSessions = Array.from(new Map(allSessions.map(s => [s.id, s])).values());
      
      await setDoc(doc(db, 'schedules', 'global_schedule'), { sessions: uniqueSessions }, { merge: true });
      alert(`Đã triển khai ${newSessions.length} buổi tập vào danh sách chấm công!`);
    }
  };

  const currentUserStudent = students.find(s => 
    s.id === user?.uid || 
    (user?.email && s.email === user.email) || 
    (user?.phoneNumber && s.phone === user.phoneNumber)
  );

  const visibleClasses = React.useMemo(() => {
    if (!currentUserStudent) return [];

    let range: { start: Date, end: Date } | null = null;
    let currentWeekOffset = 0;

    if (studentSessionFilter === 'upcoming') {
      range = { start: new Date(), end: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000) };
    } else if (studentSessionFilter === 'history') {
      range = { start: new Date(0), end: new Date() };
    }

    // For upcoming and history, we only show actual sessions
    const now = new Date();
    return sessions
      .filter(s => {
        if (s.studentId !== currentUserStudent.id) return false;
        if (studentSessionFilter === 'this_week') {
          const range = getWeekRange(0);
          const d = new Date(s.date);
          return d >= range.start && d <= range.end;
        }
        if (studentSessionFilter === 'upcoming') return isSameDayOrAfter(s.date, now) && s.status !== 'completed';
        if (studentSessionFilter === 'history') return s.status === 'completed';
        return true;
      })
      .map(s => {
        const [day, hour] = s.id.split('-');
        const trainer = trainers.find(t => t.id === s.trainerId);
        const activeContract = contracts.find(c => c.studentId === currentUserStudent.id && c.status === 'active');
        const dateObj = new Date(s.date);
        
        return {
          day,
          hour: parseInt(hour),
          trainerName: trainer?.name || 'Unknown',
          contractId: activeContract?.id,
          dateDisplay: s.date && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'N/A',
          fullDate: s.date || '',
          classId: `${day}-${hour}-${s.date}`,
          sessionId: s.id,
          status: s.status
        };
      })
      .sort((a, b) => (new Date(b.fullDate).getTime() || 0) - (new Date(a.fullDate).getTime() || 0));
  }, [currentUserStudent, studentSessionFilter, schedule, trainers, contracts, sessions]);

  if (!isLoaded) {
    return <div className="p-6 text-white">Đang tải dữ liệu...</div>;
  }

  if (isAdmin) {
    const targetWeekDates = getDatesForWeek(weekOffset);
    return (
      <div className="p-6 space-y-6 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">Xếp Lịch Tập</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setWeekOffset(0)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    weekOffset === 0 
                      ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(255,0,127,0.3)]' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Tuần này
                </button>
                <button
                  onClick={() => setWeekOffset(1)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    weekOffset === 1 
                      ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(255,0,127,0.3)]' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Tuần sau
                </button>
              </div>

              <div className="flex items-center gap-1 ml-2">
                <button 
                  onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                  title="Tuần trước"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">
                  {weekOffset > 1 ? `Tuần +${weekOffset}` : ''}
                  <span className="ml-1 opacity-50">({targetWeekDates['T2'].display} - {targetWeekDates['T7'].display})</span>
                </span>
                <button 
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                  title="Tuần sau"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleGenerate} className="bg-pink-600 text-white px-4 py-2 text-sm rounded-xl font-bold hover:bg-pink-500 transition-all flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Xếp Lịch
            </button>
            <button onClick={handleDeploySchedule} className="bg-emerald-600 text-white px-4 py-2 text-sm rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Triển khai
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-6">
          {[
            { id: 'schedule', label: 'Lịch PT', icon: Calendar },
            { id: 'students', label: 'Học viên', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === tab.id 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeSubTab === 'students' && (
            <div className="space-y-8">
              {editingStudent && (
                <StudentForm 
                  onSave={(s) => {
                    const newStudents = students.map(st => st.id === s.id ? s : st);
                    setEditingStudent(null);
                    setStudents(newStudents);
                    saveToFirebase(newStudents, trainers, schedule, warnings);
                  }}
                  initialData={editingStudent}
                  onCancelEdit={() => setEditingStudent(null)}
                  isAvailabilityOnly={true}
                />
              )}

              <StudentList 
                students={students} 
                schedule={schedule} 
                warnings={warnings}
                onEdit={setEditingStudent}
                onToggleConfirm={(id) => {
                  const newStudents = students.map(s => s.id === id ? { ...s, isScheduleConfirmed: !s.isScheduleConfirmed } : s);
                  setStudents(newStudents);
                  saveToFirebase(newStudents, trainers, schedule, warnings);
                }}
              />
            </div>
          )}

          {activeSubTab === 'schedule' && (
            <PTSchedule schedule={schedule} students={students} trainers={trainers} weekOffset={weekOffset} />
          )}
        </div>
      </div>
    );
  }

  if (isTrainer) {
    return (
      <div className="p-6 space-y-8 pb-24">
        <PTSchedule schedule={schedule} students={students} trainers={trainers} currentTrainerId={user?.uid} />
      </div>
    );
  }

  // USER VIEW
  const handleUserSaveStudent = (s: Student) => {
    if (!user) return;
    
    const studentId = currentUserStudent ? currentUserStudent.id : user.uid;
    const newStudent = { ...s, id: studentId, name: profile?.name || s.name, isScheduleConfirmed: true };
    let newStudents;
    if (currentUserStudent) {
      newStudents = students.map(st => st.id === studentId ? newStudent : st);
    } else {
      newStudents = [...students, newStudent];
    }
    setStudents(newStudents);
    saveToFirebase(newStudents, trainers, schedule, warnings);
  };

  const handleToggleConfirm = () => {
    if (!user || !currentUserStudent) return;
    const newStudents = students.map(st => st.id === currentUserStudent.id ? { ...st, isScheduleConfirmed: !st.isScheduleConfirmed } : st);
    setStudents(newStudents);
    saveToFirebase(newStudents, trainers, schedule, warnings);
  };

  const handleConfirmAttendance = async (contractId: string, classId: string) => {
    if (!confirm('Xác nhận bạn đã hoàn thành buổi tập này? (Sẽ trừ 1 buổi trong gói tập)')) return;
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    
    if (contract.usedSessions >= contract.totalSessions) {
      alert('Gói tập đã hết buổi!');
      return;
    }

    if (contract.attendedClasses?.includes(classId)) {
      alert('Bạn đã xác nhận buổi tập này rồi!');
      return;
    }
    
    const updatedContract = {
      ...contract,
      usedSessions: contract.usedSessions + 1,
      status: (contract.usedSessions + 1) >= contract.totalSessions ? 'expired' : 'active',
      attendedClasses: [...(contract.attendedClasses || []), classId]
    } as StudentContract;
    
    const newContracts = contracts.map(c => c.id === contractId ? updatedContract : c);
    
    // Also update the session status to verified and completed
    const newSessions = sessions.map(s => {
      // Session ID is `${slotId}-${entry.studentId}-${dateStr}`
      // classId is `${slotId}-${dateStr}`
      const sessionSlotId = s.id.split('-').slice(0, 2).join('-');
      const sessionClassId = `${sessionSlotId}-${s.date}`;
      
      if (s.studentId === currentUserStudent?.id && sessionClassId === classId) {
        return { ...s, verifiedByStudent: true, status: 'completed' as const };
      }
      return s;
    });

    setContracts(newContracts);
    setSessions(newSessions);

    if (user) {
      await setDoc(doc(db, 'schedules', 'global_schedule'), { 
        contracts: newContracts,
        sessions: newSessions
      }, { merge: true });
    }
  };

  const myContracts = contracts.filter(c => c.studentId === currentUserStudent?.id);

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Lịch Tập Của Tôi</h1>
      </div>
      
      {!currentUserStudent ? (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <h2 className="text-xl font-bold text-pink-500 mb-4">Đăng ký lịch tập</h2>
          <p className="text-zinc-400 mb-6">Vui lòng điền thông tin để Admin xếp lịch cho bạn.</p>
          <StudentForm 
            onSave={handleUserSaveStudent}
            initialData={{ id: user?.uid || '', name: profile?.name || '', sessionsPerWeek: 3, availableSlots: [] }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sliding Tabs */}
          <div className="flex p-1 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800/80 sticky top-4 z-40 shadow-xl">
            {[
              { id: 'overview', label: 'Tổng quan', icon: Package },
              { id: 'schedule', label: 'Lịch tập', icon: Calendar },
              { id: 'profile', label: 'Hồ sơ', icon: UserIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStudentTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative ${
                  studentTab === tab.id 
                    ? 'text-white' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {studentTab === tab.id && (
                  <motion.div 
                    layoutId="studentTabIndicator"
                    className="absolute inset-0 bg-zinc-800 rounded-xl shadow-md border border-zinc-700/50"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className={`w-4 h-4 ${studentTab === tab.id ? 'text-pink-500' : ''}`} />
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {studentTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Active Contracts */}
                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Package className="w-5 h-5 text-pink-500" />
                    Gói tập của tôi
                  </h2>
                  
                  {myContracts.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
                      {myContracts.map(contract => (
                        <div key={contract.id} className="bg-zinc-950/80 backdrop-blur-sm p-5 rounded-2xl border border-zinc-800/80 hover:border-pink-500/30 transition-colors group">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">{contract.packageName}</h3>
                              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {contract.startDate && !isNaN(new Date(contract.startDate).getTime()) ? new Date(contract.startDate).toLocaleDateString('vi-VN') : 'N/A'} - {contract.endDate && !isNaN(new Date(contract.endDate).getTime()) ? new Date(contract.endDate).toLocaleDateString('vi-VN') : 'N/A'}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              contract.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                              contract.status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'
                            }`}>
                              {contract.status === 'active' ? 'Đang tập' : contract.status === 'expired' ? 'Hết hạn' : 'Đã hủy'}
                            </span>
                          </div>
                          
                          <div className="mt-5 pt-5 border-t border-zinc-800/50">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-zinc-400 font-medium">Tiến độ</span>
                              <span className="text-white font-bold">{contract.usedSessions} / {contract.totalSessions} <span className="text-zinc-500 font-normal">buổi</span></span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-zinc-800">
                              <div 
                                className="bg-gradient-to-r from-pink-600 to-pink-400 h-full rounded-full transition-all duration-1000 ease-out relative" 
                                style={{ width: `${Math.min(100, (contract.usedSessions / contract.totalSessions) * 100)}%` }}
                              >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
                              </div>
                            </div>
                          </div>

                          {/* Debt / Installments Info */}
                          {contract.installments && contract.installments.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-zinc-800/50">
                              <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-bold text-zinc-300">Lịch thanh toán trả góp</span>
                              </div>
                              <div className="space-y-2">
                                {contract.installments.map((inst, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                      <span className="text-zinc-500 text-xs w-12">Kỳ {idx + 1}</span>
                                      <span className="text-zinc-300 font-medium">{inst.date && !isNaN(new Date(inst.date).getTime()) ? new Date(inst.date).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-white">{inst.amount.toLocaleString('vi-VN')}đ</span>
                                      {inst.status === 'paid' ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 border-dashed relative z-10">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium text-zinc-400">Bạn chưa đăng ký gói tập nào</p>
                      <p className="text-sm mt-1">Vui lòng liên hệ Admin hoặc PT để được tư vấn.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {studentTab === 'schedule' && (
              <motion.div 
                key="schedule"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-pink-500" />
                      Lịch tập luyện
                    </h2>
                  </div>

                  {/* Filter Selector */}
                  <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {[
                      { id: 'this_week', label: 'Tuần này' },
                      { id: 'upcoming', label: 'Sắp tới' },
                      { id: 'history', label: 'Lịch sử' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setStudentSessionFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                          studentSessionFilter === f.id 
                            ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_10px_rgba(255,0,127,0.3)]' 
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  
                  {visibleClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {visibleClasses.map((cls, idx) => {
                        const activeContract = contracts.find(c => c.id === cls.contractId);
                        const isAttended = activeContract?.attendedClasses?.includes(cls.classId);
                        
                        return (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex flex-col items-center justify-center text-pink-500 shadow-inner">
                              <span className="text-xs font-bold uppercase">{cls.day}</span>
                              <span className="text-lg font-black leading-none mt-0.5">{cls.hour}h</span>
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg">Buổi tập PT</p>
                              <p className="text-sm text-zinc-400 flex items-center gap-1 mt-0.5">
                                <UserIcon className="w-3 h-3" /> HLV: {cls.trainerName}
                              </p>
                              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Ngày: {cls.dateDisplay}
                              </p>
                            </div>
                          </div>
                          
                          {cls.status === 'cancelled' ? (
                            <div className="w-full sm:w-auto bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                              <XCircle className="w-4 h-4" />
                              Đã hủy
                            </div>
                          ) : isAttended ? (
                            <div className="w-full sm:w-auto bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                              <CheckCircle className="w-4 h-4" />
                              Đã xác nhận
                            </div>
                          ) : (
                            <button 
                              onClick={() => cls.contractId && handleConfirmAttendance(cls.contractId, cls.classId)}
                              disabled={!cls.contractId}
                              className="w-full sm:w-auto bg-pink-500/10 text-pink-500 border border-pink-500/30 hover:bg-pink-500 hover:text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Xác nhận đã tập
                            </button>
                          )}
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 border-dashed">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium text-zinc-400">Chưa có lịch tập nào được xếp</p>
                      <p className="text-sm mt-1">Admin đang sắp xếp lịch cho bạn, vui lòng quay lại sau.</p>
                    </div>
                  )}
                </div>

                {/* Schedule Registration Info */}
                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white">Lịch rảnh đã đăng ký</h2>
                    <button 
                      onClick={() => setEditingStudent(currentUserStudent)}
                      className="text-sm font-medium text-pink-400 hover:text-pink-300 bg-pink-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                  </div>
                  
                  {editingStudent?.id === currentUserStudent.id || !currentUserStudent.isScheduleConfirmed ? (
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                      <StudentForm 
                        onSave={(s) => {
                          handleUserSaveStudent(s);
                          setEditingStudent(null);
                        }}
                        initialData={currentUserStudent}
                        onCancelEdit={currentUserStudent.isScheduleConfirmed ? () => setEditingStudent(null) : undefined}
                      />
                    </div>
                  ) : (
                    <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-3 mb-5 text-emerald-400 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                        <div>
                          <p className="font-bold">Đã chốt lịch rảnh tuần này</p>
                          <p className="text-xs text-emerald-500/80 mt-0.5">Yêu cầu của bạn đã được ghi nhận để Admin xếp lịch.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800/50">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Số buổi muốn tập</p>
                          <p className="text-2xl font-black text-white">{currentUserStudent.sessionsPerWeek} <span className="text-sm font-medium text-zinc-500">buổi/tuần</span></p>
                        </div>
                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800/50">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Khung giờ rảnh</p>
                          <p className="text-2xl font-black text-white">{currentUserStudent.availableSlots?.length || 0} <span className="text-sm font-medium text-zinc-500">khung giờ</span></p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handleToggleConfirm}
                        className="w-full text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 py-3 rounded-xl transition-colors border border-zinc-800"
                      >
                        Hủy chốt để sửa lại lịch rảnh
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {studentTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                      {currentUserStudent.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{currentUserStudent.name}</h2>
                      <p className="text-zinc-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {currentUserStudent.branchId ? 'Cơ sở ' + currentUserStudent.branchId : 'Chưa cập nhật cơ sở'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Số điện thoại</p>
                        <p className="text-white font-medium mt-0.5">{currentUserStudent.phone || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Email</p>
                        <p className="text-white font-medium mt-0.5">{currentUserStudent.email || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
