import { Task, CalendarSummary } from '../types';
import { toISODateString, isTaskScheduledForDate, isTaskOccurrenceCompleted, parseISODate } from './dateUtils';

export interface OverdueTaskItem {
  task: Task;
  occurrenceDate: string;
  daysOverdue: number;
}

export interface FilteredReminders {
  dueToday: Task[];
  overdue: Task[];
  upcoming: Task[];
  completedRecently: Task[];
}

export function getOverdueTaskItems(tasks: Task[], refDate: Date = new Date()): OverdueTaskItem[] {
  const todayStr = toISODateString(refDate);
  const items: OverdueTaskItem[] = [];

  for (const task of tasks) {
    if (!task) continue;
    const isRecurring = task.recurrence && task.recurrence !== 'NONE';

    if (!isRecurring) {
      const dueDate = task.dueDate || (task as any).due_date || '';
      if (task.status !== 'DONE' && dueDate && dueDate < todayStr) {
        const dueObj = parseISODate(dueDate);
        const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
        const dueMidnight = new Date(dueObj.getFullYear(), dueObj.getMonth(), dueObj.getDate());
        const diffDays = Math.max(1, Math.round((refMidnight.getTime() - dueMidnight.getTime()) / (1000 * 60 * 60 * 24)));
        items.push({
          task,
          occurrenceDate: dueDate,
          daysOverdue: diffDays
        });
      }
    } else {
      // Check occurrences in the last 60 days
      const checkStart = new Date(refDate);
      checkStart.setDate(refDate.getDate() - 60);

      const taskStart = parseISODate(task.dueDate || (task as any).due_date || todayStr);
      const effectiveStart = taskStart > checkStart ? taskStart : checkStart;

      const cursor = new Date(effectiveStart);
      const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

      while (cursor < refDate) {
        const dateStr = toISODateString(cursor);
        if (dateStr < todayStr && isTaskScheduledForDate(task, cursor)) {
          if (!isTaskOccurrenceCompleted(task, dateStr)) {
            const cursorMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
            const diffDays = Math.max(1, Math.round((refMidnight.getTime() - cursorMidnight.getTime()) / (1000 * 60 * 60 * 24)));
            items.push({
              task,
              occurrenceDate: dateStr,
              daysOverdue: diffDays
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  // Sort by occurrenceDate (oldest overdue first)
  items.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
  return items;
}

export function filterTaskReminders(tasks: Task[], refDate: Date = new Date()): FilteredReminders {
  const todayStr = toISODateString(refDate);

  const dueToday: Task[] = [];
  const upcoming: Task[] = [];
  const completedRecently: Task[] = [];

  const overdueItems = getOverdueTaskItems(tasks, refDate);
  const overdueMap = new Map<string, Task>();
  for (const item of overdueItems) {
    overdueMap.set(item.task.id, item.task);
  }
  const overdue = Array.from(overdueMap.values());

  for (const task of tasks) {
    const isCompletedForToday = isTaskOccurrenceCompleted(task, todayStr);
    
    if (isCompletedForToday) {
      completedRecently.push(task);
      continue;
    }

    if (isTaskScheduledForDate(task, refDate)) {
      dueToday.push(task);
    } else if (!overdueMap.has(task.id)) {
      upcoming.push(task);
    }
  }

  // Sort lists
  dueToday.sort((a, b) => (a.dueTime || (a as any).due_time || '23:59').localeCompare(b.dueTime || (b as any).due_time || '23:59'));
  upcoming.sort((a, b) => (a.dueDate || (a as any).due_date || '').localeCompare(b.dueDate || (b as any).due_date || ''));

  return {
    dueToday,
    overdue,
    upcoming,
    completedRecently
  };
}

export function calculateSummary(tasks: Task[], refDate: Date = new Date()): CalendarSummary {
  const { dueToday, completedRecently } = filterTaskReminders(tasks, refDate);
  const overdueItems = getOverdueTaskItems(tasks, refDate);
  
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
    overdueTasks: overdueItems.length,
    totalPendingAmount
  };
}
