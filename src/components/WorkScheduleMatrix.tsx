import React from 'react';
import { Trainer, Schedule, DAYS, HOURS } from '../types';

interface WorkScheduleMatrixProps {
  trainers: Trainer[];
  schedule: Schedule;
}

export const WorkScheduleMatrix: React.FC<WorkScheduleMatrixProps> = ({ trainers, schedule }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-zinc-300">
        <thead className="bg-zinc-900">
          <tr>
            <th className="p-3 text-left">Nhân viên</th>
            {DAYS.map(day => (
              <th key={day} className="p-3 text-center">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {trainers.map(trainer => (
            <tr key={trainer.id} className="hover:bg-zinc-800/50">
              <td className="p-3 font-bold text-white">{trainer.name}</td>
              {DAYS.map(day => (
                <td key={day} className="p-3 text-center">
                  {HOURS.map(hour => {
                    const slotId = `${day}-${hour}`;
                    const entries = schedule[slotId] || [];
                    const trainerEntry = entries.find(e => e.trainerId === trainer.id);
                    
                    if (!trainerEntry) return null;
                    
                    return (
                      <div key={hour} className="text-[10px] bg-zinc-800 rounded p-1 mb-1">
                        {hour}:00 - {trainerEntry.type === 'off' ? 'Nghỉ' : trainerEntry.studentId}
                      </div>
                    );
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
