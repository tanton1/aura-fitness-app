import React, { useState, useMemo } from 'react';
import { Student, Trainer, Schedule, DAYS, HOURS } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, Clock, Info } from 'lucide-react';
import { getDatesForCurrentWeek, getDatesForWeek } from '../utils/dateUtils';

interface Props {
  schedule: Schedule;
  students: Student[];
  trainers: Trainer[];
  currentTrainerId?: string;
  weekOffset?: number;
}

export default function PTSchedule({ schedule, students, trainers, currentTrainerId, weekOffset = 0 }: Props) {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(currentTrainerId || trainers[0]?.id || '');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(DAYS[0]);
  
  const currentWeekDates = useMemo(() => getDatesForWeek(weekOffset), [weekOffset]);

  const getStudentName = (id: string) => {
    return students.find(s => s.id === id)?.name || 'Unknown';
  };

  if (trainers.length === 0) {
    return (
      <div className="bg-zinc-900 p-8 rounded-2xl text-center text-zinc-400 border border-zinc-800 flex flex-col items-center justify-center min-h-[300px]">
        <Info className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="text-lg font-medium text-zinc-300">Chưa có Huấn luyện viên</p>
        <p className="text-sm mt-2">Vui lòng thêm Huấn luyện viên trước khi xem lịch.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 md:p-6 rounded-2xl shadow-xl border border-zinc-800 flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-0 mb-4 gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
              <Calendar className="w-6 h-6 text-pink-500" />
            </div>
            {currentTrainerId ? 'Lịch Của Tôi' : 'Lịch Huấn Luyện'}
          </h2>
          <AnimatePresence mode="wait">
            {highlightedStudentId ? (
              <motion.div 
                key="highlighted"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 flex items-center gap-2 flex-wrap"
              >
                <span className="text-sm text-zinc-400">Đang xem lịch của:</span>
                <span className="text-sm font-bold text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                  {getStudentName(highlightedStudentId)}
                </span>
                <button 
                  onClick={() => setHighlightedStudentId(null)}
                  className="text-zinc-500 hover:text-white text-xs underline ml-2 transition-colors"
                >
                  Bỏ chọn
                </button>
              </motion.div>
            ) : (
              <motion.p 
                key="normal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-zinc-400 mt-3"
              >
                Quản lý và theo dõi lịch tập của học viên theo từng khung giờ.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        
        {!currentTrainerId && (
          <div className="relative w-full md:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="w-4 h-4 text-zinc-500" />
            </div>
            <select
              value={selectedTrainerId}
              onChange={(e) => setSelectedTrainerId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-10 py-3 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent font-medium appearance-none transition-all shadow-sm"
            >
              {trainers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Day Selector */}
      <div className="md:hidden flex overflow-x-auto gap-2 px-4 mb-4 pb-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border transition-all ${
              selectedDay === day
                ? 'bg-pink-500 text-white border-pink-500'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      
      {/* Schedule Table */}
      <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950 border-y md:border md:rounded-xl border-zinc-800 shadow-inner -mx-px md:mx-0">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
          <div className="min-w-[300px] md:min-w-[800px] w-full">
            <table className="w-full text-sm text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-30">
                <tr>
                  <th className="border-b border-r border-zinc-800 p-2 bg-zinc-900 w-16 md:w-20 text-center font-bold text-zinc-400 uppercase sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <Clock className="w-4 h-4 mx-auto mb-1 opacity-50" />
                    Giờ
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className={`border-b border-r border-zinc-800 p-2 bg-zinc-900 text-center font-bold text-zinc-200 uppercase tracking-wider ${selectedDay !== day ? 'hidden md:table-cell' : ''}`}>
                      <div className="flex flex-col items-center justify-center">
                        <span>{day}</span>
                        <span className="text-[10px] text-zinc-500 font-normal mt-0.5">{currentWeekDates[day]?.display}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour} className="group">
                    <td className="border-b border-r border-zinc-800 p-2 text-center font-mono font-bold bg-zinc-900/80 text-zinc-500 group-hover:text-pink-400 transition-colors sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                      {hour}:00
                    </td>
                    {DAYS.map(day => {
                      if (selectedDay !== day) return <td key={`${day}-${hour}`} className="hidden md:table-cell border-b border-r border-zinc-800/50"></td>;
                      
                      const slotId = `${day}-${hour}`;
                      const slotEntries = schedule[slotId] || [];
                      const trainerEntries = slotEntries.filter(e => e.trainerId === selectedTrainerId);
                      const studentIds = trainerEntries.map(e => e.studentId);
                      
                      const isHighlighted = highlightedStudentId && studentIds.includes(highlightedStudentId);
                      const isDimmed = highlightedStudentId && !studentIds.includes(highlightedStudentId);
                      
                      return (
                        <td 
                          key={slotId}
                          className={`border-b border-r border-zinc-800/50 p-1 md:p-1.5 text-center transition-all duration-300 align-top relative ${
                            isHighlighted
                              ? 'bg-pink-500/10 shadow-[inset_0_0_20px_rgba(236,72,153,0.1)] border-pink-500/30'
                              : studentIds.length > 0 
                                ? isDimmed ? 'bg-zinc-950 opacity-30' : 'bg-zinc-900/30 hover:bg-zinc-800/50' 
                                : 'bg-transparent text-zinc-800 hover:bg-zinc-900/30'
                          }`}
                        >
                          {studentIds.length > 0 ? (
                            <div className="flex flex-col gap-1 h-full justify-start">
                              {studentIds.map(id => (
                                <motion.button 
                                  whileHover={{ scale: 1.02, y: -1 }}
                                  whileTap={{ scale: 0.98 }}
                                  key={id} 
                                  onClick={() => setHighlightedStudentId(id === highlightedStudentId ? null : id)}
                                  className={`w-full truncate text-xs md:text-sm font-bold rounded-lg px-2 py-1.5 border text-left transition-all shadow-sm ${
                                    highlightedStudentId === id
                                      ? 'bg-pink-500 text-white border-pink-400 shadow-[0_4px_15px_rgba(236,72,153,0.4)]'
                                      : 'text-zinc-300 bg-zinc-800 border-zinc-700 hover:border-pink-500/50 hover:text-pink-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${highlightedStudentId === id ? 'bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'bg-pink-500'}`} />
                                    <span className="truncate">{getStudentName(id)}</span>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-zinc-700 text-xs font-bold">+</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 mx-4 md:mx-0 flex flex-wrap gap-4 text-xs md:text-sm font-medium bg-zinc-950 p-3 md:p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-5 h-5 bg-zinc-800 border border-zinc-700 rounded-md flex items-center justify-center shadow-sm">
             <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
          </div>
          <span className="text-zinc-300">Đã xếp lịch <span className="text-zinc-500 font-normal">(Tối đa 2 HV/Slot)</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-zinc-950 border border-zinc-800 rounded-md border-dashed"></div>
          <span className="text-zinc-500">Slot trống</span>
        </div>
      </div>
    </div>
  );
}
