import { Student, Trainer, Schedule, Warning, SchedulerResult, DAYS, HOURS, StudentContract } from '../types';

function getDayIndex(day: string): number {
  return DAYS.indexOf(day as any);
}

const MAX_STUDENTS_PER_PT = 2;

export function generateSchedule(
  students: Student[], 
  trainers: Trainer[], 
  contracts: StudentContract[],
  existingSchedule?: Schedule
): SchedulerResult {
  const schedule: Schedule = {};
  const warnings: Warning[] = [];

  if (trainers.length === 0) return { schedule, warnings };

  // Initialize schedule
  for (const day of DAYS) {
    for (const hour of HOURS) {
      schedule[`${day}-${hour}`] = [];
    }
  }

  const studentNeeds: Record<string, number> = {};
  const studentScheduledDays: Record<string, Set<string>> = {};
  const studentScheduledSlots: Record<string, string[]> = {};

  for (const s of students) {
    studentNeeds[s.id] = s.sessionsPerWeek;
    studentScheduledDays[s.id] = new Set();
    studentScheduledSlots[s.id] = [];
  }

  // Pre-fill locked entries from existing schedule
  if (existingSchedule) {
    for (const day of DAYS) {
      for (const hour of HOURS) {
        const slotId = `${day}-${hour}`;
        const existingEntries = existingSchedule[slotId] || [];
        for (const entry of existingEntries) {
          if (entry.isLocked || entry.type === 'off') {
            schedule[slotId].push(entry);
            
            // Update student tracking
            if (entry.studentId !== 'OFF' && studentNeeds[entry.studentId] !== undefined) {
              studentNeeds[entry.studentId]--;
              studentScheduledDays[entry.studentId].add(day);
              studentScheduledSlots[entry.studentId].push(slotId);
            }
          }
        }
      }
    }
  }

  // Map students to their active contracts
  const studentContracts = new Map<string, StudentContract>();
  contracts.forEach(c => {
    if (c.status === 'active') {
      studentContracts.set(c.studentId, c);
    }
  });

  // Only schedule students with active contracts
  const activeStudents = students.filter(s => studentContracts.has(s.id));

  // Sort students by least available slots first
  const sortedStudents = [...activeStudents].sort(
    (a, b) => (a.availableSlots?.length || 0) - (b.availableSlots?.length || 0)
  );

  // Scheduling logic: Group by branch
  const branches = Array.from(new Set(trainers.map(t => t.branchId).filter(Boolean))) as string[];
  // If no branches are defined, run at least once for the "empty" branch
  const allBranchIds = branches.length > 0 ? branches : [""];
  
  for (const branchId of allBranchIds) {
    // Trainers for this branch: those assigned to it PLUS those with no assignment (floating)
    const branchTrainers = trainers.filter(t => {
      const tBranchId = t.branchId || "";
      return tBranchId === branchId || tBranchId === "";
    }).sort((a, b) => (a.priority || 999) - (b.priority || 999));
    
    if (branchTrainers.length === 0) continue;

    // Students for this branch: those assigned to it PLUS those with no assignment (floating)
    const branchStudents = sortedStudents.filter(s => {
      const sBranchId = studentContracts.get(s.id)?.branchId || "";
      return sBranchId === branchId || sBranchId === "";
    });

    for (let i = 0; i < branchTrainers.length; i++) {
      const trainer = branchTrainers[i];
      const isPT2AndBeyond = i >= 1;

      for (const student of branchStudents) {
        if (studentNeeds[student.id] > 0) {
          // If student has a specific trainer assigned in contract, only schedule with that trainer
          const assignedTrainerId = studentContracts.get(student.id)?.trainerId;
          if (assignedTrainerId && assignedTrainerId !== trainer.id) continue;

          scheduleStudentWithTrainer(
            student, 
            trainer, 
            isPT2AndBeyond, 
            schedule, 
            studentNeeds, 
            studentScheduledDays, 
            studentScheduledSlots
          );
        }
      }
    }
  }

  return { schedule, warnings: calculateWarnings(activeStudents, trainers, schedule) };
}

export function calculateWarnings(
  students: Student[],
  trainers: Trainer[],
  schedule: Schedule
): Warning[] {
  const warnings: Warning[] = [];
  const studentScheduledSlots: Record<string, string[]> = {};

  for (const s of students) {
    studentScheduledSlots[s.id] = [];
  }

  for (const day of DAYS) {
    for (const hour of HOURS) {
      const slotId = `${day}-${hour}`;
      const entries = schedule[slotId] || [];
      for (const entry of entries) {
        if (entry.studentId !== 'OFF' && studentScheduledSlots[entry.studentId]) {
          studentScheduledSlots[entry.studentId].push(slotId);
        }
      }
    }
  }

  for (const student of students) {
    const scheduled = studentScheduledSlots[student.id].length;
    if (scheduled < student.sessionsPerWeek) {
      const suggestions = getSuggestions(student, schedule, trainers, studentScheduledSlots[student.id]);
      warnings.push({
        studentId: student.id,
        scheduled,
        requested: student.sessionsPerWeek,
        suggestions
      });
    } else if (scheduled > student.sessionsPerWeek) {
      warnings.push({
        studentId: student.id,
        scheduled,
        requested: student.sessionsPerWeek,
        suggestions: []
      });
    }
  }

  return warnings;
}

function scheduleStudentWithTrainer(
  student: Student,
  trainer: Trainer,
  isPT2AndBeyond: boolean,
  schedule: Schedule,
  studentNeeds: Record<string, number>,
  studentScheduledDays: Record<string, Set<string>>,
  studentScheduledSlots: Record<string, string[]>
) {
  let needed = studentNeeds[student.id];
  if (needed <= 0) return;

  const scheduledDays = studentScheduledDays[student.id];
  const scheduledSlots = studentScheduledSlots[student.id];

  // Find available slots for THIS specific trainer
  const slotsByDay: Record<string, string[]> = {};
  for (const slot of student.availableSlots || []) {
    const [day, hourStr] = slot.split('-');
    const hour = parseInt(hourStr, 10);
    
    // Rule: Max 1 session per day per student
    if (scheduledDays.has(day)) continue; 

    // Check if this trainer has capacity in this slot
    const trainerEntries = (schedule[slot] || []).filter(e => e.trainerId === trainer.id);
    const isOff = trainerEntries.some(e => e.type === 'off');
    if (!isOff && trainerEntries.length < MAX_STUDENTS_PER_PT) {
      if (!slotsByDay[day]) slotsByDay[day] = [];
      slotsByDay[day].push(slot);
    }
  }

  const availableDays = Object.keys(slotsByDay).sort((a, b) => getDayIndex(a) - getDayIndex(b));
  if (availableDays.length === 0) return;

  const findDayCombinations = (days: string[], k: number): string[][] => {
    const result: string[][] = [];
    const f = (start: number, current: string[]) => {
      if (current.length === k) {
        result.push([...current]);
        return;
      }
      for (let i = start; i < days.length; i++) {
        f(i + 1, [...current, days[i]]);
      }
    };
    f(0, []);
    return result;
  };

  // Generate all possible slot combinations for a given day combination
  const getSlotCombinations = (dayCombo: string[]): string[][] => {
    if (dayCombo.length === 0) return [[]];
    const firstDay = dayCombo[0];
    const restDays = dayCombo.slice(1);
    const restCombos = getSlotCombinations(restDays);
    const result: string[][] = [];
    for (const slot of slotsByDay[firstDay]) {
      for (const restCombo of restCombos) {
        result.push([slot, ...restCombo]);
      }
    }
    return result;
  };

  let bestSlotCombination: string[] | null = null;
  let bestCombinationScore = -999999;

  // Try to find the best combination of slots to fulfill the remaining needed sessions
  for (let k = Math.min(needed, availableDays.length); k > 0; k--) {
    const dayCombos = findDayCombinations(availableDays, k);
    
    for (const dayCombo of dayCombos) {
      // Calculate day gap violations
      const allDays = [...Array.from(scheduledDays), ...dayCombo].sort((d1, d2) => getDayIndex(d1) - getDayIndex(d2));
      
      let consecutiveCount = 1;
      let maxConsecutive = 1;
      let twoConsecutiveCount = 0;

      for (let i = 1; i < allDays.length; i++) {
        const diff = getDayIndex(allDays[i]) - getDayIndex(allDays[i - 1]);
        if (diff === 1) {
          consecutiveCount++;
          if (consecutiveCount === 2) twoConsecutiveCount++;
        } else if (diff > 1) {
          consecutiveCount = 1;
        }
        if (consecutiveCount > maxConsecutive) {
          maxConsecutive = consecutiveCount;
        }
      }

      const slotCombos = getSlotCombinations(dayCombo);

      for (const slotCombo of slotCombos) {
        let comboScore = 0;

        // Penalize 3 consecutive days heavily
        if (maxConsecutive >= 3) {
          comboScore -= 5000;
        }
        // Slight penalty for 2 consecutive days (so spaced is preferred, but easily overridden by trainer convenience)
        comboScore -= twoConsecutiveCount * 150;

        for (const slot of slotCombo) {
          const [day, hourStr] = slot.split('-');
          const hour = parseInt(hourStr, 10);
          const hourIndex = HOURS.indexOf(hour);
          
          const count = (schedule[slot] || []).filter(e => e.trainerId === trainer.id).length;
          if (count === 1) comboScore += 200; // Prioritize pairing students (filling a slot to 2/2)

          // Contiguous shift logic for the trainer
          let hasClassesToday = false;
          for (let i = 0; i < HOURS.length; i++) {
            if (i === hourIndex) continue;
            const h = HOURS[i];
            const isTeaching = schedule[`${day}-${h}`]?.some(e => e.trainerId === trainer.id);
            if (isTeaching) {
              hasClassesToday = true;
              const diff = Math.abs(i - hourIndex);
              if (diff === 1) comboScore += 100; // Contiguous shift (liền mạch)
              else if (diff === 2) comboScore -= 50; // 1 shift gap (nghỉ 1 ca)
              else if (diff === 3) comboScore -= 20; // 2 shift gap (nghỉ 2 ca)
              else comboScore -= 5;
            }
          }
          if (!hasClassesToday) comboScore += 10; // First class of the day is better than creating a gap
        }

        if (comboScore > bestCombinationScore) {
          bestCombinationScore = comboScore;
          bestSlotCombination = slotCombo;
        }
      }
    }
    
    // If we found a valid combination for this 'k' (number of days), we stop searching smaller 'k's
    if (bestSlotCombination) {
      break;
    }
  }

  if (bestSlotCombination) {
    for (const slot of bestSlotCombination) {
      const day = slot.split('-')[0];
      schedule[slot].push({ studentId: student.id, trainerId: trainer.id });
      scheduledDays.add(day);
      scheduledSlots.push(slot);
      needed--;
    }
    studentNeeds[student.id] = needed;
  }
}

function getSuggestions(
  student: Student,
  schedule: Schedule,
  trainers: Trainer[],
  scheduledSlots: string[]
): string[] {
  const suggestions: string[] = [];
  const scoredSlots: { slot: string, score: number }[] = [];

  for (const day of DAYS) {
    for (const hour of HOURS) {
      const slot = `${day}-${hour}`;
      if (scheduledSlots.includes(slot)) continue;

      let capacity = 0;
      let hasHalfFullPT = false;
      let currentStudents = 0;

      for (let i = 0; i < trainers.length; i++) {
        const t = trainers[i];
        
        const trainerEntries = (schedule[slot] || []).filter(e => e.trainerId === t.id);
        const isOff = trainerEntries.some(e => e.type === 'off');
        if (isOff) continue;

        capacity += MAX_STUDENTS_PER_PT;
        const count = trainerEntries.length;
        currentStudents += count;
        if (count === 1) hasHalfFullPT = true;
      }

      if (currentStudents < capacity) {
        let score = 0;
        if (currentStudents > 0) {
          score += 10;
          if (hasHalfFullPT) score += 5;
        } else {
          score += 1;
        }
        scoredSlots.push({ slot, score });
      }
    }
  }

  scoredSlots.sort((a, b) => b.score - a.score);
  suggestions.push(...scoredSlots.slice(0, 6).map(s => s.slot));
  return suggestions;
}
