/**
 * Date utility functions for Calendario Compartido
 */
import { Task, TaskRecurrence } from '../types';

export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon to prevent timezone drift
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isDateToday(dateStr: string, refDate: Date = new Date()): boolean {
  const target = parseISODate(dateStr);
  return isSameDay(target, refDate);
}

export function isDateOverdue(dateStr: string, refDate: Date = new Date()): boolean {
  const todayStr = toISODateString(refDate);
  return dateStr < todayStr;
}

export function formatReadableDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

export function formatFullDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getMonthMatrix(year: number, month: number): Date[] {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Starting day of week (Monday as 0, Sunday as 6)
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  const days: Date[] = [];

  // Previous month trailing days
  for (let i = startingDay; i > 0; i--) {
    const prevDate = new Date(year, month, 1 - i);
    days.push(prevDate);
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Next month leading days to complete full 7-day rows
  const totalDays = days.length;
  const remainingCells = (7 - (totalDays % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export function getWeekDays(referenceDate: Date): Date[] {
  const current = new Date(referenceDate);
  let dayOfWeek = current.getDay() - 1;
  if (dayOfWeek < 0) dayOfWeek = 6;

  const monday = new Date(current);
  monday.setDate(current.getDate() - dayOfWeek);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    week.push(day);
  }
  return week;
}

export function formatCurrency(amount?: number, currency = 'USD'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Checks if a task is scheduled to appear on a specific calendar date (handling one-time and recurring tasks)
 */
export function isTaskScheduledForDate(task: Task, date: Date): boolean {
  const dateStr = toISODateString(date);

  // If task start date is after the given date, it does not apply yet
  if (task.dueDate > dateStr) {
    return false;
  }

  const recurrence = task.recurrence || 'NONE';

  if (recurrence === 'NONE') {
    return task.dueDate === dateStr;
  }

  if (recurrence === 'DAILY') {
    return true;
  }

  const taskStart = parseISODate(task.dueDate);

  if (recurrence === 'WEEKLY') {
    return date.getDay() === taskStart.getDay();
  }

  if (recurrence === 'MONTHLY') {
    const targetDay = task.recurrenceDay || taskStart.getDate();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    // If target day is 31 and month has 30 or 28 days, match the last day of the month
    if (targetDay > daysInMonth) {
      return date.getDate() === daysInMonth;
    }
    return date.getDate() === targetDay;
  }

  if (recurrence === 'YEARLY') {
    return date.getMonth() === taskStart.getMonth() && date.getDate() === taskStart.getDate();
  }

  return false;
}

/**
 * Checks if a task is completed for a specific occurrence date
 */
export function isTaskOccurrenceCompleted(task: Task, dateStr: string): boolean {
  if (task.recurrence && task.recurrence !== 'NONE') {
    return Boolean(task.completedDates?.includes(dateStr));
  }
  return task.status === 'DONE';
}

export function formatRecurrenceLabel(recurrence?: TaskRecurrence, day?: number): string {
  switch (recurrence) {
    case 'DAILY':
      return 'Diaria';
    case 'WEEKLY':
      return 'Semanal';
    case 'MONTHLY':
      return day ? `Mensual (día ${day})` : 'Mensual';
    case 'YEARLY':
      return 'Anual';
    default:
      return '';
  }
}
