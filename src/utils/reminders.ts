import { Task, CalendarSummary } from '../types';
import { toISODateString } from './dateUtils';

export interface FilteredReminders {
  dueToday: Task[];
  overdue: Task[];
  upcoming: Task[];
  completedRecently: Task[];
}

export function filterTaskReminders(tasks: Task[], refDate: Date = new Date()): FilteredReminders {
  const todayStr = toISODateString(refDate);

  const dueToday: Task[] = [];
  const overdue: Task[] = [];
  const upcoming: Task[] = [];
  const completedRecently: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'DONE') {
      completedRecently.push(task);
      continue;
    }

    if (task.dueDate === todayStr) {
      dueToday.push(task);
    } else if (task.dueDate < todayStr) {
      overdue.push(task);
    } else {
      upcoming.push(task);
    }
  }

  // Sort overdue (oldest first) and dueToday (by time if available)
  overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  dueToday.sort((a, b) => (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59'));
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    dueToday,
    overdue,
    upcoming,
    completedRecently
  };
}

export function calculateSummary(tasks: Task[], refDate: Date = new Date()): CalendarSummary {
  const { dueToday, overdue } = filterTaskReminders(tasks, refDate);
  
  let pendingCount = 0;
  let completedCount = 0;
  let totalPendingAmount = 0;

  for (const task of tasks) {
    if (task.status === 'DONE') {
      completedCount++;
    } else {
      pendingCount++;
      if (task.amount) {
        totalPendingAmount += Number(task.amount);
      }
    }
  }

  return {
    totalTasks: tasks.length,
    pendingTasks: pendingCount,
    completedTasks: completedCount,
    dueTodayTasks: dueToday.length,
    overdueTasks: overdue.length,
    totalPendingAmount
  };
}
