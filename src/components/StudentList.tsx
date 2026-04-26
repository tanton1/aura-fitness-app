import React from 'react';
import { Student, Schedule, Warning, Branch, StudentContract } from '../types';
import { AlertTriangle, MessageSquare, Trash2, Edit2, CheckCircle2, Circle, MapPin, Lock, Unlock, AlertCircle } from 'lucide-react';

interface Props {
  students: Student[];
  schedule: Schedule;
  warnings: Warning[];
  branches?: Branch[];
  contracts?: StudentContract[];
  overriddenSessions?: Record<string, number>;
  onUpdateSessionOverride?: (studentId: string, sessions: number) => void;
  onDelete?: (id: string) => void;
  onEdit: (student: Student) => void;
  onToggleConfirm?: (id: string) => void;
  onToggleLockSchedule?: (id: string) => void;
}

export default function StudentList({ students, schedule, warnings, branches, contracts = [], overriddenSessions = {}, onUpdateSessionOverride, onDelete, onEdit, onToggleConfirm, onToggleLockSchedule }: Props) {
  const getStudentSchedule = (studentId: string) => {
    const slots: string[] = [];
    Object.entries(schedule).forEach(([slotId, entries]) => {
      if (entries.some(e => e.studentId === studentId)) {
        slots.push(slotId);
      }
    });
    
    // Sort slots by day then hour
    return slots.sort((a, b) => {
      const [dayA, hourA] = a.split('-');
      const [dayB, hourB] = b.split('-');
      if (dayA !== dayB) return dayA.localeCompare(dayB);
      return parseInt(hourA) - parseInt(hourB);
    });
  };

  const isStudentLocked = (studentId: string) => {
    let locked = false;
    Object.values(schedule).forEach(entries => {
      if (entries.some(e => e.studentId === studentId && e.isLocked)) {
        locked = true;
      }
    });
    return locked;
  };

  const formatSlot = (slotId: string) => {
    const [day, hour] = slotId.split('-');
    return `${day} (${hour}h)`;
  };

  const warningsByBranch = React.useMemo(() => {
    const grouped: Record<string, Warning[]> = {};
    (warnings || []).forEach(w => {
      const student = (students || []).find(s => s.id === w.studentId);
      const branchId = student?.branchId || 'none';
      if (!grouped[branchId]) {
        grouped[branchId] = [];
      }
      grouped[branchId].push(w);
    });
    return grouped;
  }, [warnings, students]);

  const getBranchName = (branchId: string) => {
    if (branchId === 'none') return 'Chưa xác định';
    return branches?.find(b => b.id === branchId)?.name || 'Chưa xác định';
  };

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-4">
          <h3 className="text-amber-400 font-bold uppercase tracking-wide flex items-center gap-2 text-sm">
            <AlertTriangle size={18} />
            Cảnh báo xếp lịch ({warnings.length})
          </h3>
          <div className="space-y-4">
            {Object.entries(warningsByBranch).map(([branchId, branchWarnings]: [string, Warning[]]) => (
              <div key={branchId} className="space-y-2">
                <h4 className="text-amber-500/80 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={12} />
                  {getBranchName(branchId)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {branchWarnings.map((warning, idx) => {
                    const student = students.find(s => s.id === warning.studentId);
                    return (
                      <div key={idx} className="bg-zinc-950/50 p-3 rounded-xl border border-amber-500/20 shadow-sm flex flex-col justify-between">
                        <div>
                          <p className="font-medium text-zinc-200 text-sm">
                            <span className="text-amber-400 font-bold">{student?.name}</span>: {warning.scheduled}/{warning.requested} buổi
                          </p>
                          {warning.suggestions.length > 0 && (
                            <div className="mt-2 text-xs">
                              <span className="text-zinc-500">Gợi ý thêm giờ rảnh: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {warning.suggestions.slice(0, 3).map((slot, i) => (
                                  <span key={slot} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {formatSlot(slot)}
                                  </span>
                                ))}
                                {warning.suggestions.length > 3 && (
                                  <span className="text-[10px] text-zinc-500 px-1 py-0.5">+{warning.suggestions.length - 3}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-3">
            <span className="w-2 h-6 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
            Danh sách Học viên ({(students || []).length})
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/50">
          {(students || []).length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-medium">
              Chưa có học viên nào. Hãy thêm học viên ở tab Đăng ký.
            </div>
          ) : (
            (students || []).map(student => {
              const studentSchedule = getStudentSchedule(student.id);
              const message = `Chào ${student.name}, lịch tập tuần này của bạn là: ${studentSchedule.map(formatSlot).join(', ')}.`;
              
              // Check for warnings
              const now = new Date();
              const activeContract = contracts.find(c => {
                if (c.studentId !== student.id || c.status !== 'active') return false;
                const endDate = new Date(c.endDate);
                const timeDiff = endDate.getTime() - now.getTime();
                const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
                const sessionsLeft = c.totalSessions - c.usedSessions;
                return daysLeft >= 0 && sessionsLeft > 0;
              });
              const hasBranchMismatch = activeContract && activeContract.branchId !== student.branchId;
              const hasNoBranch = !student.branchId || student.branchId === 'none';
              const hasLowSlots = (student.availableSlots?.length || 0) < 5;
              
              const warning = warnings.find(w => w.studentId === student.id);
              const customSessions = overriddenSessions[student.id];
              const displaySessions = customSessions !== undefined ? customSessions : student.sessionsPerWeek;
              const isUnderScheduled = warning && warning.scheduled < warning.requested;
              const isOverScheduled = warning && warning.scheduled > warning.requested;
              
              const showRedWarning = hasBranchMismatch || hasNoBranch || hasLowSlots || isUnderScheduled || isOverScheduled;
              
              return (
                <div key={student.id} className={`p-6 hover:bg-zinc-800/30 transition-colors ${showRedWarning ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-zinc-100 text-xl flex items-center gap-2">
                        {student.name}
                        {showRedWarning && (
                          <AlertCircle size={18} className="text-red-500" />
                        )}
                      </h3>
                      <div className="text-sm text-zinc-400 mt-1 font-medium flex flex-wrap items-center gap-1">
                        <span>Đăng ký:</span> 
                        <select 
                          value={displaySessions || 3}
                          onChange={(e) => onUpdateSessionOverride && onUpdateSessionOverride(student.id, parseInt(e.target.value))}
                          className="bg-zinc-950 border border-zinc-800 text-pink-400 rounded-lg px-2 py-0.5 focus:outline-none focus:border-pink-500 appearance-none font-bold"
                          title="Thay đổi số buổi tuần này"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <span className="text-pink-400">buổi/tuần</span>
                        {customSessions !== undefined && <span className="text-xs text-orange-400 ml-1" title="Đã thay đổi riêng cho tuần này">(Tạm thời)</span>}
                        <span className="mx-1">|</span>
                        <span>Đã xếp:</span> <span className={`${isUnderScheduled || isOverScheduled ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>{warning?.scheduled || 0} buổi</span>
                        <span className="mx-1">|</span>
                        <span>Rảnh:</span> <span className={`${hasLowSlots ? 'text-red-400 font-bold' : 'text-pink-400'}`}>{student.availableSlots?.length || 0} slots</span>
                      </div>
                      {showRedWarning && (
                        <div className="mt-2 text-xs font-medium text-red-400 flex flex-col gap-1">
                          {(hasNoBranch || hasBranchMismatch) && (
                            <p>• Chi nhánh học viên: {getBranchName(student.branchId || 'none')} | Chi nhánh hợp đồng: {activeContract ? getBranchName(activeContract.branchId || 'none') : 'Không có'}</p>
                          )}
                          {hasLowSlots && (
                            <p>• Số khung giờ rảnh quá ít (dưới 5 slots)</p>
                          )}
                          {isUnderScheduled && (
                            <p>• Chưa xếp đủ lịch ({warning.scheduled}/{warning.requested})</p>
                          )}
                          {isOverScheduled && (
                            <p>• Xếp quá số buổi ({warning.scheduled}/{warning.requested})</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {onToggleLockSchedule && studentSchedule.length > 0 && (
                        <button 
                          onClick={() => onToggleLockSchedule(student.id)}
                          className={`p-2 rounded-lg transition-colors ${isStudentLocked(student.id) ? 'text-pink-500 hover:bg-pink-500/10' : 'text-zinc-500 hover:text-pink-400 hover:bg-pink-500/10'}`}
                          title={isStudentLocked(student.id) ? "Mở khóa lịch tập" : "Khóa lịch tập (không bị đổi khi xếp lại)"}
                        >
                          {isStudentLocked(student.id) ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                      )}
                      {onToggleConfirm && (
                        <button 
                          onClick={() => onToggleConfirm(student.id)}
                          className={`p-2 rounded-lg transition-colors ${student.isScheduleConfirmed ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                          title={student.isScheduleConfirmed ? "Đã chốt lịch rảnh" : "Chưa chốt lịch rảnh"}
                        >
                          {student.isScheduleConfirmed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                      )}
                      <button 
                        onClick={() => onEdit(student)}
                        className="text-zinc-500 hover:text-pink-400 p-2 rounded-lg hover:bg-pink-500/10 transition-colors"
                        title="Sửa học viên"
                      >
                        <Edit2 size={18} />
                      </button>
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(student.id)}
                          className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Xóa học viên"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {studentSchedule.length > 0 ? (
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-start gap-3">
                      <MessageSquare size={18} className="text-pink-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                        {message}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600 italic font-medium">Chưa được xếp lịch</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
