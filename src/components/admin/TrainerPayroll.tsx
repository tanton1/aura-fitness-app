import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Trainer, Session, Payroll, Branch, StudentContract, UserProfile, Student, HOURS } from '../../types';
import { CheckCircle, XCircle, DollarSign, Calendar, Trash2, RotateCcw, User as UserIcon, Clock, Filter, Edit2 } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import { LOGO_URL } from '../../constants';
import { useDatabase } from '../../contexts/DatabaseContext';

interface Props {
  user: FirebaseUser | null;
  profile: UserProfile | null;
}

export default function TrainerPayroll({ user, profile }: Props) {
  const { trainers, sessions, students, branches, contracts, updateSession, deleteSession, addSession, updateContract } = useDatabase();
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [sessionSearch, setSessionSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date, end: Date } | null>(null);
  
  // Edit Session State
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editFormData, setEditFormData] = useState({ date: '', hour: 0, trainerId: '' });

  const markSession = async (sessionId: string, status: 'completed' | 'cancelled' | 'scheduled') => {
    if (!user) return;
    
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    let contractToUpdate = null;
    if (session.verifiedByStudent && status !== 'completed') {
      const classIdToRemove = `${session.id.split('-').slice(0, 2).join('-')}-${session.date}`;
      const contract = contracts.find(c => c.studentId === session.studentId && c.attendedClasses?.includes(classIdToRemove));
      if (contract) {
        const newUsedSessions = Math.max(0, contract.usedSessions - 1);
        contractToUpdate = { 
          ...contract, 
          usedSessions: newUsedSessions,
          status: newUsedSessions < contract.totalSessions ? 'active' : contract.status,
          attendedClasses: contract.attendedClasses.filter(id => id !== classIdToRemove)
        };
      }
    }

    const updatedSession: Session = { 
      ...session, 
      status, 
      verifiedByStudent: status === 'scheduled' ? false : session.verifiedByStudent 
    };
    
    try {
      await updateSession(updatedSession);
      if (contractToUpdate) {
        await updateContract(contractToUpdate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user || !confirm('Bạn có chắc chắn muốn xóa buổi tập này?')) return;
    
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    let contractToUpdate = null;
    if (session.verifiedByStudent) {
      const classIdToRemove = `${session.id.split('-').slice(0, 2).join('-')}-${session.date}`;
      const contract = contracts.find(c => c.studentId === session.studentId && c.attendedClasses?.includes(classIdToRemove));
      if (contract) {
        const newUsedSessions = Math.max(0, contract.usedSessions - 1);
        contractToUpdate = { 
          ...contract, 
          usedSessions: newUsedSessions,
          status: newUsedSessions < contract.totalSessions ? 'active' : contract.status,
          attendedClasses: contract.attendedClasses.filter(id => id !== classIdToRemove)
        };
      }
    }

    try {
      await deleteSession(sessionId);
      if (contractToUpdate) {
        await updateContract(contractToUpdate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSession = (session: Session) => {
    const hour = parseInt(session.id.split('-')[1]) || 6;
    setEditFormData({
      date: session.date,
      hour: hour,
      trainerId: session.trainerId
    });
    setEditingSession(session);
  };

  const saveEditedSession = async () => {
    if (!user || !editingSession) return;
    
    const dateObj = new Date(editFormData.date);
    const dayOfWeek = dateObj.getDay();
    const dayCode = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
    const newId = `${dayCode}-${editFormData.hour}-${editingSession.studentId}-${editFormData.date}`;

    const updatedSession: Session = {
      ...editingSession,
      id: newId,
      date: editFormData.date,
      trainerId: editFormData.trainerId,
    };

    try {
      if (editingSession.id !== newId) {
        await deleteSession(editingSession.id);
        await addSession(updatedSession);
      } else {
        await updateSession(updatedSession);
      }
      setEditingSession(null);
    } catch (e) {
      alert('Lỗi khi lưu: ' + (e as Error).message);
    }
  };

  const filteredSessions = sessions.filter(s => {

    // Filter by PT subtab
    if (selectedTrainerId !== 'all' && s.trainerId !== selectedTrainerId) return false;

    // Filter by search
    if (sessionSearch) {
      const student = students.find(st => st.id === s.studentId);
      const trainer = trainers.find(t => t.id === s.trainerId);
      const match = student?.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
                    trainer?.name.toLowerCase().includes(sessionSearch.toLowerCase());
      if (!match) return false;
    }

    // Filter by date range
    if (dateRange) {
      const sessionDate = new Date(s.date);
      if (sessionDate < dateRange.start || sessionDate > dateRange.end) return false;
    }

    // Filter by day
    if (selectedDay !== 'all') {
      const sessionDate = new Date(s.date);
      const dayOfWeek = sessionDate.getDay();
      // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
      // User wants T2-T7, so Monday=1, ..., Saturday=6
      if (dayOfWeek !== selectedDay) return false;
    }

    return true;
  });

  const groupedSessions = React.useMemo(() => {
    const groups: Record<string, Session[]> = {};
    filteredSessions.forEach(s => {
      if (!groups[s.date]) {
        groups[s.date] = [];
      }
      groups[s.date].push(s);
    });
    
    const sortedDates = Object.keys(groups).sort((a, b) => (new Date(b).getTime() || 0) - (new Date(a).getTime() || 0));
    
    return sortedDates.map(date => ({
      date,
      sessions: groups[date].sort((a, b) => {
        const hourA = parseInt(a.id.split('-')[1]) || 0;
        const hourB = parseInt(b.id.split('-')[1]) || 0;
        return hourA - hourB;
      })
    }));
  }, [filteredSessions]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-8 flex items-center gap-3">
        <img src={LOGO_URL} alt="Aura" className="h-10 w-10 object-contain" />
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-medium text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] tracking-tight border-b-4 border-pink-500/30 pb-2 inline-block shadow-[0_6px_0_rgba(236,72,153,0.2)] rounded-2xl">
            Lương PT
          </h1>
          <p className="text-zinc-400 mt-2">Quản lý lịch dạy và chấm công</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Tìm tên HV hoặc PT..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <DateRangeFilter onFilter={(start, end) => setDateRange({ start, end })} />
        </div>
      </div>

      {/* PT Subtabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedTrainerId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
            selectedTrainerId === 'all' 
              ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.3)]' 
              : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
          }`}
        >
          Tất cả PT
        </button>
        {trainers.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTrainerId(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
              selectedTrainerId === t.id 
                ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.3)]' 
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Day Subtabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedDay('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
            selectedDay === 'all' 
              ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.3)]' 
              : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
          }`}
        >
          Tất cả
        </button>
        {[1, 2, 3, 4, 5, 6, 0].map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
              selectedDay === day 
                ? 'bg-pink-500 text-white border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.3)]' 
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {day === 0 ? 'CN' : `Thứ ${day + 1}`}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lịch dạy */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-500" />
            Lịch dạy ({filteredSessions.length})
          </h3>
          <div className="space-y-6">
            {groupedSessions.map(group => {
              const dateObj = new Date(group.date);
              const isValidDate = group.date && !isNaN(dateObj.getTime());
              const dayOfWeek = isValidDate ? dateObj.getDay() : 0;
              const dayName = isValidDate ? (dayOfWeek === 0 ? 'Chủ Nhật' : `Thứ ${dayOfWeek + 1}`) : 'Unknown';
              
              return (
                <div key={group.date} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <Calendar className="w-4 h-4 text-pink-500" />
                    <h4 className="font-bold text-white">{dayName}, {isValidDate ? dateObj.toLocaleDateString('vi-VN') : 'N/A'}</h4>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{group.sessions.length} ca</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {group.sessions.map(s => {
                      const student = students.find(st => st.id === s.studentId);
                      const trainer = trainers.find(t => t.id === s.trainerId);
                      const branch = branches.find(b => b.id === s.branchId);
                      const hour = s.id.split('-')[1];

                      return (
                        <div key={s.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-start gap-3">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center min-w-[60px]">
                              <span className="block text-xs text-zinc-500 uppercase">Ca</span>
                              <span className="block text-lg font-black text-pink-500">{hour}h</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-zinc-200 font-medium">
                                <UserIcon className="w-4 h-4 text-pink-500" />
                                {student?.name || 'Học viên ẩn (Đã xóa)'}
                              </div>
                              <p className="text-zinc-500 text-xs flex items-center gap-1">
                                PT: <span className="text-zinc-400">{trainer?.name}</span> • {branch?.name || 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'completed' ? 'bg-green-900/50 text-green-400 border border-green-500/20' : s.status === 'cancelled' ? 'bg-red-900/50 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                                  {s.status === 'completed' ? 'Đã dạy' : s.status === 'cancelled' ? 'Đã hủy' : 'Chưa dạy'}
                                </span>
                                {s.status === 'completed' && (
                                  <span className={`text-[9px] font-bold uppercase tracking-tight ${s.verifiedByStudent ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {s.verifiedByStudent ? '✓ HV đã xác nhận' : '⚠ Chờ xác nhận'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 w-full sm:w-auto justify-end border-t sm:border-t-0 border-zinc-800 pt-3 sm:pt-0 mt-1 sm:mt-0">
                            {s.status === 'scheduled' ? (
                              <>
                                <button onClick={() => markSession(s.id, 'completed')} className="p-2 text-green-400 hover:text-green-300 bg-green-500/10 rounded-lg transition-colors" title="Hoàn thành"><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => markSession(s.id, 'cancelled')} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors" title="Hủy buổi (Bảo lưu)"><XCircle className="w-4 h-4" /></button>
                                <button onClick={() => handleEditSession(s)} className="p-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-lg transition-colors" title="Đổi lịch/Đổi PT"><Edit2 className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <button onClick={() => markSession(s.id, 'scheduled')} className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors" title="Hoàn tác"><RotateCcw className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => deleteSession(s.id)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors" title="Xóa vĩnh viễn"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {groupedSessions.length === 0 && (
              <div className="text-center py-10 text-zinc-500">
                Không có lịch dạy nào.
              </div>
            )}
          </div>
        </div>

        {/* Chấm công & Lương */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Chấm công PT
            </h3>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Tổng chi trả</p>
              <p className="text-xl font-black text-white">
                {trainers
                  .filter(t => selectedTrainerId === 'all' || t.id === selectedTrainerId)
                  .reduce((sum, t) => {
                    const completed = sessions.filter(s => s.trainerId === t.id && s.status === 'completed' && s.verifiedByStudent);
                    const sessionComm = completed.length * (t.commissionPerSession || 0);
                    const referralContracts = contracts.filter(c => c.referralCode === t.employeeCode);
                    const referralComm = referralContracts.reduce((s, c) => s + (c.referralCommission || 0), 0);
                    return sum + sessionComm + referralComm;
                  }, 0).toLocaleString()}đ
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {trainers
              .filter(t => selectedTrainerId === 'all' || t.id === selectedTrainerId)
              .map(t => {
                const completedSessions = sessions.filter(s => s.trainerId === t.id && s.status === 'completed' && s.verifiedByStudent);
              const sessionCommission = completedSessions.length * (t.commissionPerSession || 0);
              
              // Referral commissions: find contracts where this PT's employeeCode was used
              const referralContracts = contracts.filter(c => c.referralCode === t.employeeCode);
              const referralCommission = referralContracts.reduce((sum, c) => sum + (c.referralCommission || 0), 0);
              
              const totalCommission = sessionCommission + referralCommission;

              return (
                <div key={t.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{t.name} {t.employeeCode && <span className="text-zinc-500 text-xs">({t.employeeCode})</span>}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Dạy: <span className="text-zinc-300">{sessionCommission.toLocaleString()}đ</span> ({completedSessions.length} buổi)</p>
                      {referralCommission > 0 && (
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Giới thiệu: <span className="text-zinc-300">{referralCommission.toLocaleString()}đ</span> ({referralContracts.length} HĐ)</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">{totalCommission.toLocaleString()}đ</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Đổi lịch tập / Đổi PT</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Ngày tập</label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={e => setEditFormData({...editFormData, date: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-pink-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Giờ tập</label>
                <select
                  value={editFormData.hour}
                  onChange={e => setEditFormData({...editFormData, hour: parseInt(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-pink-500"
                >
                  {HOURS.map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Huấn luyện viên</label>
                <select
                  value={editFormData.trainerId}
                  onChange={e => setEditFormData({...editFormData, trainerId: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-pink-500"
                >
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditingSession(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={saveEditedSession}
                className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-500 transition-colors font-medium"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
