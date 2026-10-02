import { Task, CalendarSummary } from '../types';
import { toISODateString, isTaskScheduledForDate, isTaskOccurrenceCompleted, parseISODate } from './dateUtils';

export interface OverdueTaskItem {
  task: Task;
  occurrenceDate: string;
  daysOverdue: number;
}

export interface MonthPendingTaskItem {
  task: Task;
  occurrenceDate: string;
  isOverdue: boolean;
  isToday: boolean;
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

export function getMonthPendingTaskItems(tasks: Task[], refDate: Date = new Date()): MonthPendingTaskItem[] {
  const todayStr = toISODateString(new Date());
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const items: MonthPendingTaskItem[] = [];

  for (const task of tasks) {
    if (!task) continue;
    const isRecurring = task.recurrence && task.recurrence !== 'NONE';

    if (!isRecurring) {
      const dueDate = task.dueDate || (task as any).due_date || '';
      if (dueDate.startsWith(monthPrefix) && task.status !== 'DONE') {
        items.push({
          task,
          occurrenceDate: dueDate,
          isOverdue: dueDate < todayStr,
          isToday: dueDate === todayStr
        });
      }
    } else {
      // Check each day of the active month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        if (isTaskScheduledForDate(task, dayDate)) {
          const dateStr = toISODateString(dayDate);
          if (!isTaskOccurrenceCompleted(task, dateStr)) {
            items.push({
              task,
              occurrenceDate: dateStr,
              isOverdue: dateStr < todayStr,
              isToday: dateStr === todayStr
            });
          }
        }
      }
    }
  }

  // Sort chronologically by occurrenceDate
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
  let totalPaidAmount = 0;

  for (const task of tasks) {
    if (!task) continue;
    const isRecurring = task.recurrence && task.recurrence !== 'NONE';
    const amount = Number(task.amount) || 0;

    if (!isRecurring) {
      if (task.status === 'DONE') {
        totalPaidAmount += amount;
      } else {
        pendingCount++;
        totalPendingAmount += amount;
      }
    } else {
      const completedDates = task.completedDates || (task as any).completed_dates || [];
      if (Array.isArray(completedDates)) {
        totalPaidAmount += amount * completedDates.length;
      }
      pendingCount++;
      totalPendingAmount += amount;
    }
  }

  // Monthly Budget & Task Counts Calculation for the active month (refDate)
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthName = `${monthNames[month]} ${year}`;

  let monthPaidAmount = 0;
  let monthPendingAmount = 0;
  let monthCompletedTasks = 0;
  let monthPendingTasks = 0;
  let monthTotalTasks = 0;

  for (const task of tasks) {
    if (!task) continue;
    const isRecurring = task.recurrence && task.recurrence !== 'NONE';
    const amount = Number(task.amount) || 0;

    if (!isRecurring) {
      const dueDate = task.dueDate || (task as any).due_date || '';
      if (dueDate.startsWith(monthPrefix)) {
        monthTotalTasks++;
        if (task.status === 'DONE') {
          monthCompletedTasks++;
          monthPaidAmount += amount;
        } else {
          monthPendingTasks++;
          monthPendingAmount += amount;
        }
      }
    } else {
      // Check each day of the active month for scheduled occurrences
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        if (isTaskScheduledForDate(task, dayDate)) {
          const dateStr = toISODateString(dayDate);
          monthTotalTasks++;
          if (isTaskOccurrenceCompleted(task, dateStr)) {
            monthCompletedTasks++;
            monthPaidAmount += amount;
          } else {
            monthPendingTasks++;
            monthPendingAmount += amount;
          }
        }
      }
    }
  }

  const monthTotalBudget = monthPaidAmount + monthPendingAmount;

  return {
    totalTasks: tasks.length,
    pendingTasks: pendingCount,
    completedTasks: completedRecently.length,
    dueTodayTasks: dueToday.length,
    overdueTasks: overdueItems.length,
    totalPendingAmount,
    totalPaidAmount,
    monthName,
    monthTotalBudget,
    monthPaidAmount,
    monthPendingAmount,
    monthTotalTasks,
    monthCompletedTasks,
    monthPendingTasks
  };
}
