import {
  Student,
  Trainer,
  Schedule,
  Warning,
  SchedulerResult,
  StudentContract,
  ScheduleConfig,
} from "../types";

function getDayIndex(day: string, config: ScheduleConfig): number {
  return config.workingDays.indexOf(day as any);
}

const MAX_STUDENTS_PER_PT = 2;

export function getStudentSessionsPerWeek(
  student: Student,
  config: ScheduleConfig,
  overriddenSessions?: Record<string, number>,
): number {
  if (overriddenSessions && overriddenSessions[student.id] !== undefined) {
    return overriddenSessions[student.id];
  }
  return Number(student.sessionsPerWeek) || 0;
}

export function generateSchedule(
  students: Student[],
  trainers: Trainer[],
  contracts: StudentContract[],
  config: ScheduleConfig,
  existingSchedule?: Schedule,
  overriddenSessions?: Record<string, number>,
  targetDate: Date = new Date(),
): SchedulerResult {
  const schedule: Schedule = {};
  const warnings: Warning[] = [];
  const debugSteps: string[] = [];

  if (trainers.length === 0) return { schedule, warnings, debugSteps };

  // Initialize schedule
  for (const day of config.workingDays) {
    for (const hour of config.workingHours) {
      schedule[`${day}-${hour}`] = [];
    }
  }

  const studentNeeds: Record<string, number> = {};
  const studentScheduledDays: Record<string, Set<string>> = {};
  const studentScheduledSlots: Record<string, string[]> = {};

  for (const s of students) {
    const sessions = getStudentSessionsPerWeek(s, config, overriddenSessions);
    studentNeeds[s.id] = sessions;
    studentScheduledDays[s.id] = new Set();
    studentScheduledSlots[s.id] = [];
  }

  // Pre-fill all entries from existing schedule
  if (existingSchedule) {
    for (const day of config.workingDays) {
      for (const hour of config.workingHours) {
        const slotId = `${day}-${hour}`;
        const existingEntries = existingSchedule[slotId] || [];
        for (const entry of existingEntries) {
          schedule[slotId].push(entry);

          // Update student tracking
          if (
            entry.studentId !== "OFF" &&
            studentNeeds[entry.studentId] !== undefined
          ) {
            studentNeeds[entry.studentId]--;
            studentScheduledDays[entry.studentId].add(day);
            studentScheduledSlots[entry.studentId].push(slotId);
          }
        }
      }
    }
  }

  // Map students to their active contracts
  const studentContracts = new Map<string, StudentContract[]>();
  const now = new Date(targetDate);
  now.setHours(0, 0, 0, 0); // Start of target week

  // Sort contracts by start date descending to ensure we get the latest
  const sortedContracts = [...contracts].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );

  sortedContracts.forEach((c) => {
    if (c.status === "active") {
      let startDate = new Date(c.startDate || 0);
      if (isNaN(startDate.getTime())) startDate = new Date(0);

      const endOfTargetWeek = new Date(now);
      endOfTargetWeek.setDate(now.getDate() + 6);
      endOfTargetWeek.setHours(23, 59, 59, 999);

      let endDate = new Date(c.endDate || (now.getTime() + 1000 * 3600 * 24 * 365));
      if (isNaN(endDate.getTime())) endDate = new Date(now.getTime() + 1000 * 3600 * 24 * 365);
      
      endDate.setHours(23, 59, 59, 999);
      const timeDiff = endDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

      // Fallback for old data where totalSessions might be undefined
      const totalSess = c.totalSessions !== undefined ? c.totalSessions : 999;
      const sessionsLeft = totalSess - (c.usedSessions || 0);

      if (
        daysLeft >= 0 &&
        sessionsLeft > 0 &&
        startDate.getTime() <= endOfTargetWeek.getTime()
      ) {
        const existing = studentContracts.get(c.studentId) || [];
        studentContracts.set(c.studentId, [...existing, c]);
      } else {
        const reason = [];
        if (daysLeft < 0) reason.push(`Hết hạn (còn ${daysLeft} ngày)`);
        if (sessionsLeft <= 0) reason.push(`Hết buổi (còn ${sessionsLeft} buổi)`);
        if (startDate.getTime() > endOfTargetWeek.getTime()) reason.push(`Chưa tới ngày học (Start: ${startDate.toLocaleDateString()})`);
        
        debugSteps.push(
          `Bỏ qua HĐ của ${c.studentId}: ${reason.join(', ')}`,
        );
      }
    }
  });

  // Only schedule students with active contracts
  // If they have an active contract, they should be scheduled even if their profile status was manually set to 'inactive'
  const activeStudents = students.filter(
    (s) => studentContracts.has(s.id)
  );

  if (activeStudents.length === 0) {
    debugSteps.push(`Lỗi: Không tìm thấy học viên nào có hợp đồng khả dụng trong tuần này để xếp lịch.`);
  }

  // Sort students by least available slots first
  const sortedStudents = [...activeStudents].sort((a, b) => {
    const aLen = Array.isArray(a.availableSlots) ? a.availableSlots.length : 0;
    const bLen = Array.isArray(b.availableSlots) ? b.availableSlots.length : 0;
    return aLen - bLen;
  });

  const sortedTrainers = [...trainers].sort(
    (a, b) => (a.priority || 999) - (b.priority || 999),
  );

  for (let i = 0; i < sortedTrainers.length; i++) {
    const trainer = sortedTrainers[i];
    const tBranchId = trainer.branchId || "";

    for (const student of sortedStudents) {
      if (studentNeeds[student.id] > 0) {
        const studentActiveContracts = studentContracts.get(student.id) || [];
        const sBranchId = studentActiveContracts[0]?.branchId || student.branchId || "";
        const tBranchId = trainer.branchId || "";
        
        // If trainer is not floating, and their branch doesn't match student's branch, skip.
        if (tBranchId !== "" && sBranchId !== "" && tBranchId !== sBranchId) {
          debugSteps.push(
            `Bỏ qua Trainer ${trainer.name} (cơ sở ${tBranchId}) cho Student ${student.name} (cơ sở ${sBranchId}) do khác cơ sở.`,
          );
          continue;
        }

        // If student has a specific trainer assigned in contract, only schedule with that trainer
        const validTrainerIds = new Set<string>();
        for (const c of studentActiveContracts) {
          if (c.trainerId) validTrainerIds.add(c.trainerId);
          if (c.trainerIds) {
            c.trainerIds.forEach(id => validTrainerIds.add(id));
          }
        }

        if (validTrainerIds.size > 0 && !validTrainerIds.has(trainer.id)) {
          debugSteps.push(
            `Bỏ qua Trainer ${trainer.name} do HĐ của Student ${student.name} không giao PT này quản lý.`,
          );
          continue;
        }

        scheduleStudentWithTrainer(
          student,
          trainer,
          false,
          schedule,
          studentNeeds,
          studentScheduledDays,
          studentScheduledSlots,
          config,
          debugSteps,
        );
      }
    }
  }

  return {
    schedule,
    warnings: calculateWarnings(
      activeStudents,
      trainers,
      schedule,
      config,
      overriddenSessions,
    ),
    debugSteps,
  };
}

export function calculateWarnings(
  students: Student[],
  trainers: Trainer[],
  schedule: Schedule,
  config: ScheduleConfig,
  overriddenSessions?: Record<string, number>,
): Warning[] {
  const warnings: Warning[] = [];
  const studentScheduledSlots: Record<string, string[]> = {};

  for (const s of students) {
    studentScheduledSlots[s.id] = [];
  }

  for (const day of config.workingDays) {
    for (const hour of config.workingHours) {
      const slotId = `${day}-${hour}`;
      const entries = schedule[slotId] || [];
      for (const entry of entries) {
        if (
          entry.studentId !== "OFF" &&
          studentScheduledSlots[entry.studentId]
        ) {
          studentScheduledSlots[entry.studentId].push(slotId);
        }
      }
    }
  }

  for (const student of students) {
    const slots = studentScheduledSlots[student.id] || [];
    const scheduled = slots.length;
    const requested = getStudentSessionsPerWeek(
      student,
      config,
      overriddenSessions,
    );

    const dayCounts: Record<string, number> = {};
    const slotCounts: Record<string, number> = {};

    slots.forEach((slot) => {
      const day = slot.split("-")[0];
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
    });

    const multipleSessionsDays = Object.keys(dayCounts).filter(
      (day) => dayCounts[day] > 1,
    );
    const overlappingSlots = Object.keys(slotCounts).filter(
      (slot) => slotCounts[slot] > 1,
    );

    if (scheduled < requested) {
      const suggestions = getSuggestions(
        student,
        schedule,
        trainers,
        studentScheduledSlots[student.id],
        config,
      );
      const warningObj: Warning = {
        studentId: student.id,
        scheduled,
        requested,
        suggestions,
      };
      if (multipleSessionsDays.length > 0) warningObj.multipleSessionsDays = multipleSessionsDays;
      if (overlappingSlots.length > 0) warningObj.overlappingSlots = overlappingSlots;
      warnings.push(warningObj);
    } else if (
      scheduled > requested ||
      multipleSessionsDays.length > 0 ||
      overlappingSlots.length > 0
    ) {
      const warningObj: Warning = {
        studentId: student.id,
        scheduled,
        requested,
        suggestions: [],
      };
      if (multipleSessionsDays.length > 0) warningObj.multipleSessionsDays = multipleSessionsDays;
      if (overlappingSlots.length > 0) warningObj.overlappingSlots = overlappingSlots;
      warnings.push(warningObj);
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
  studentScheduledSlots: Record<string, string[]>,
  config: ScheduleConfig,
  debugSteps?: string[],
) {
  let needed = studentNeeds[student.id];
  if (needed <= 0 || isNaN(needed)) {
    debugSteps?.push(`Bỏ qua phân bổ thêm cho HV ${student.name} vì số buổi cần học trong tuần = ${needed}`);
    return;
  }

  const scheduledDays = studentScheduledDays[student.id];
  const scheduledSlots = studentScheduledSlots[student.id];

  // Find available slots for THIS specific trainer
  const slotsByDay: Record<string, string[]> = {};
  const availableSlotsArray = Array.isArray(student.availableSlots)
    ? student.availableSlots
    : [];
  for (const slot of availableSlotsArray) {
    const [day, hourStr] = slot.split("-");
    const hour = parseInt(hourStr, 10);

    if (!config.workingDays.includes(day as any)) continue;

    // Rule: Max 1 session per day per student
    if (scheduledDays.has(day)) continue;

    // Constraint: Trainer's designated available slots
    if (trainer.availableSlots && trainer.availableSlots.length > 0) {
      if (!trainer.availableSlots.includes(slot)) {
        continue; // PT is "off" or not available in this slot
      }
    }

    // Check if this trainer has capacity in this slot
    const trainerEntries = (schedule[slot] || []).filter(
      (e) => e.trainerId === trainer.id,
    );
    const isOff = trainerEntries.some(
      (e) => e.type === "off" || e.studentId === "OFF",
    );
    if (!isOff && trainerEntries.length < MAX_STUDENTS_PER_PT) {
      if (!slotsByDay[day]) slotsByDay[day] = [];
      slotsByDay[day].push(slot);
    }
  }

  const availableDays = Object.keys(slotsByDay).sort(
    (a, b) => getDayIndex(a, config) - getDayIndex(b, config),
  );
  if (availableDays.length === 0) {
    debugSteps?.push(
      `Học viên ${student.name} + Trainer ${trainer.name}: Học viên chưa thiết lập lịch rảnh trong form, hoặc lịch rảnh trùng ngày nghỉ.`,
    );
    return;
  }

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
      const allDays = [...Array.from(scheduledDays), ...dayCombo].sort(
        (d1, d2) => getDayIndex(d1, config) - getDayIndex(d2, config),
      );

      let consecutiveCount = 1;
      let maxConsecutive = 1;
      let twoConsecutiveCount = 0;

      for (let i = 1; i < allDays.length; i++) {
        const diff =
          getDayIndex(allDays[i], config) - getDayIndex(allDays[i - 1], config);
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
          const [day, hourStr] = slot.split("-");
          const hour = parseInt(hourStr, 10);
          const hourIndex = config.workingHours.indexOf(hour);

          const count = (schedule[slot] || []).filter(
            (e) => e.trainerId === trainer.id,
          ).length;
          if (count === 1) comboScore += 200; // Prioritize pairing students (filling a slot to 2/2)

          // Contiguous shift logic for the trainer
          let hasClassesToday = false;
          for (let i = 0; i < config.workingHours.length; i++) {
            if (i === hourIndex) continue;
            const h = config.workingHours[i];
            const isTeaching = schedule[`${day}-${h}`]?.some(
              (e) => e.trainerId === trainer.id,
            );
            if (isTeaching) {
              hasClassesToday = true;
              const diff = Math.abs(i - hourIndex);
              if (diff === 1)
                comboScore += 100; // Contiguous shift (liền mạch)
              else if (diff === 2)
                comboScore -= 50; // 1 shift gap (nghỉ 1 ca)
              else if (diff === 3)
                comboScore -= 20; // 2 shift gap (nghỉ 2 ca)
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
      const day = slot.split("-")[0];
      schedule[slot].push({
        studentId: student.id,
        trainerId: trainer.id,
        type: "training",
      });
      scheduledDays.add(day);
      scheduledSlots.push(slot);
      needed--;
    }
    studentNeeds[student.id] = needed;
    debugSteps?.push(
      `Xếp thành công: HV ${student.name} + PT ${trainer.name} -> ${bestSlotCombination.join(", ")}`,
    );
  } else {
    debugSteps?.push(
      `Thất bại: HV ${student.name} + PT ${trainer.name}: Lịch rảnh rải rác hoặc không thoả mãn điều kiện xếp ${needed} buổi.`,
    );
  }
}

function getSuggestions(
  student: Student,
  schedule: Schedule,
  trainers: Trainer[],
  scheduledSlots: string[],
  config: ScheduleConfig,
): string[] {
  const suggestions: string[] = [];
  const scoredSlots: { slot: string; score: number }[] = [];

  for (const day of config.workingDays) {
    for (const hour of config.workingHours) {
      const slot = `${day}-${hour}`;
      if (scheduledSlots.includes(slot)) continue;

      let capacity = 0;
      let hasHalfFullPT = false;
      let currentStudents = 0;

      for (let i = 0; i < trainers.length; i++) {
        const t = trainers[i];

        const trainerEntries = (schedule[slot] || []).filter(
          (e) => e.trainerId === t.id,
        );
        const isOff = trainerEntries.some(
          (e) => e.type === "off" || e.studentId === "OFF",
        );
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
  suggestions.push(...scoredSlots.slice(0, 6).map((s) => s.slot));
  return suggestions;
}
