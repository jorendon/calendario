import { Task, CalendarSummary } from '../types';
import { toISODateString, isTaskScheduledForDate, isTaskOccurrenceCompleted } from './dateUtils';

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
    const isCompletedForToday = isTaskOccurrenceCompleted(task, todayStr);
    
    if (isCompletedForToday) {
      completedRecently.push(task);
      continue;
    }

    if (isTaskScheduledForDate(task, refDate)) {
      dueToday.push(task);
    } else if (!task.recurrence || task.recurrence === 'NONE') {
      if (task.dueDate < todayStr) {
        overdue.push(task);
      } else {
        upcoming.push(task);
      }
    } else {
      // For recurring tasks, if due date was set in the past and today is after recurrence day
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
  const { dueToday, overdue, completedRecently } = filterTaskReminders(tasks, refDate);
  
  let pendingCount = 0;
  let totalPendingAmount = 0;

  for (const task of tasks) {
    const isDone = task.status === 'DONE';
    if (!isDone) {
      pendingCount++;
      if (task.amount) {
        totalPendingAmount += Number(task.amount);
      }
    }
  }

  return {
    totalTasks: tasks.length,
    pendingTasks: pendingCount,
    completedTasks: completedRecently.length,
    dueTodayTasks: dueToday.length,
    overdueTasks: overdue.length,
    totalPendingAmount
  };
}
