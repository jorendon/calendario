/**
 * Date utility functions for Calendario Compartido
 */

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
  
  // Starting day of week (Monday as 0, Sunday as 6 for European/Latin standard)
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6; // Sunday becomes index 6

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

  // Next month leading days to complete full 7-day rows (up to 35 or 42 cells)
  const totalDays = days.length;
  const remainingCells = (7 - (totalDays % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    days.push(new Date(year, month + 1, i));
  }

  // If only 35 days, optionally fill to 42 for fixed calendar height if desired, but 35 or 42 is fine
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
