import { describe, it, expect } from 'vitest';
import {
  toISODateString,
  parseISODate,
  isSameDay,
  isDateToday,
  isDateOverdue,
  getMonthMatrix,
  getWeekDays,
  formatCurrency
} from '../src/utils/dateUtils';

describe('dateUtils', () => {
  it('converts Date to ISO string YYYY-MM-DD correctly', () => {
    const d = new Date(2026, 8, 18); // Month index 8 is September
    expect(toISODateString(d)).toBe('2026-09-18');
  });

  it('parses ISO date string to valid Date', () => {
    const d = parseISODate('2026-09-18');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(18);
  });

  it('identifies same days accurately', () => {
    const d1 = new Date(2026, 8, 18, 10, 0);
    const d2 = new Date(2026, 8, 18, 22, 30);
    const d3 = new Date(2026, 8, 19, 10, 0);
    expect(isSameDay(d1, d2)).toBe(true);
    expect(isSameDay(d1, d3)).toBe(false);
  });

  it('detects today and overdue dates relative to reference date', () => {
    const refDate = new Date(2026, 8, 18); // 2026-09-18
    expect(isDateToday('2026-09-18', refDate)).toBe(true);
    expect(isDateToday('2026-09-17', refDate)).toBe(false);

    expect(isDateOverdue('2026-09-17', refDate)).toBe(true);
    expect(isDateOverdue('2026-09-18', refDate)).toBe(false);
    expect(isDateOverdue('2026-09-19', refDate)).toBe(false);
  });

  it('generates a valid month matrix with Monday-first grid', () => {
    // September 2026 starts on Tuesday (Sept 1 is Tuesday, Monday is Aug 31)
    const matrix = getMonthMatrix(2026, 8);
    expect(matrix.length % 7).toBe(0);
    expect(matrix.length).toBeGreaterThanOrEqual(28);
    expect(matrix[0].getDay()).toBe(1); // First day in row is Monday
  });

  it('generates a 7-day week starting on Monday', () => {
    const refDate = new Date(2026, 8, 18); // Friday
    const week = getWeekDays(refDate);
    expect(week.length).toBe(7);
    expect(week[0].getDay()).toBe(1); // Monday
    expect(week[6].getDay()).toBe(0); // Sunday
  });

  it('formats currency with symbol', () => {
    expect(formatCurrency(1500)).toContain('1,500');
    expect(formatCurrency(undefined)).toBe('');
  });
});
