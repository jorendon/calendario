import { describe, it, expect } from 'vitest';
import { filterTaskReminders, calculateSummary, getOverdueTaskItems } from '../src/utils/reminders';
import { Task } from '../src/types';

describe('reminders and calendar summary', () => {
  const refDate = new Date(2026, 8, 18); // 2026-09-18

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      calendarId: 'cal-1',
      title: 'Pagar la renta',
      amount: 1800,
      dueDate: '2026-09-18', // Today
      dueTime: '09:00',
      category: 'rent',
      status: 'PENDING',
      createdBy: 'Jonathan.rendon@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'task-2',
      calendarId: 'cal-1',
      title: 'Pagar servicio de internet',
      amount: 80,
      dueDate: '2026-09-15', // Overdue
      category: 'bills',
      status: 'PENDING',
      createdBy: 'michrotel@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'task-3',
      calendarId: 'cal-1',
      title: 'Comprar víveres',
      dueDate: '2026-09-22', // Upcoming
      category: 'chores',
      status: 'PENDING',
      createdBy: 'Jonathan.rendon@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 'task-4',
      calendarId: 'cal-1',
      title: 'Seguro del auto',
      amount: 150,
      dueDate: '2026-09-10',
      category: 'bills',
      status: 'DONE',
      completedAt: '2026-09-10T14:00:00Z',
      completedBy: 'michrotel@gmail.com',
      createdBy: 'michrotel@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    }
  ];

  it('filters due today, overdue and completed tasks correctly', () => {
    const result = filterTaskReminders(mockTasks, refDate);
    expect(result.dueToday.length).toBe(1);
    expect(result.dueToday[0].title).toBe('Pagar la renta');

    expect(result.overdue.length).toBe(1);
    expect(result.overdue[0].title).toBe('Pagar servicio de internet');

    expect(result.upcoming.length).toBe(1);
    expect(result.upcoming[0].title).toBe('Comprar víveres');

    expect(result.completedRecently.length).toBe(1);
    expect(result.completedRecently[0].title).toBe('Seguro del auto');
  });

  it('calculates calendar summary with correct totals and pending amounts', () => {
    const summary = calculateSummary(mockTasks, refDate);
    expect(summary.totalTasks).toBe(4);
    expect(summary.pendingTasks).toBe(3);
    expect(summary.completedTasks).toBe(1);
    expect(summary.dueTodayTasks).toBe(1);
    expect(summary.overdueTasks).toBe(1);
    // 1800 (rent) + 80 (internet) = 1880 pending amount (car insurance is DONE so excluded)
    expect(summary.totalPendingAmount).toBe(1880);
    // Month budget calculations:
    expect(summary.monthName).toBe('Septiembre 2026');
    expect(summary.monthPaidAmount).toBe(150);
    expect(summary.monthPendingAmount).toBe(1880);
    expect(summary.monthTotalBudget).toBe(2030);
    expect(summary.monthTotalTasks).toBe(4);
    expect(summary.monthCompletedTasks).toBe(1);
    expect(summary.monthPendingTasks).toBe(3);
  });

  it('calculates monthly budget correctly with recurring tasks', () => {
    const tasksWithRecurring: Task[] = [
      {
        id: 'rec-1',
        calendarId: 'cal-1',
        title: 'Gimnasio mensual',
        amount: 50,
        dueDate: '2026-01-05',
        category: 'fitness',
        recurrence: 'MONTHLY',
        recurrenceDay: 5,
        completedDates: ['2026-09-05'],
        status: 'PENDING',
        createdBy: 'Jonathan.rendon@gmail.com',
        createdAt: '2026-01-01T00:00:00Z'
      },
      {
        id: 'rec-2',
        calendarId: 'cal-1',
        title: 'Membresía streaming',
        amount: 15,
        dueDate: '2026-01-20',
        category: 'entertainment',
        recurrence: 'MONTHLY',
        recurrenceDay: 20,
        completedDates: [],
        status: 'PENDING',
        createdBy: 'Jonathan.rendon@gmail.com',
        createdAt: '2026-01-01T00:00:00Z'
      }
    ];

    const summary = calculateSummary(tasksWithRecurring, refDate);
    expect(summary.monthPaidAmount).toBe(50);
    expect(summary.monthPendingAmount).toBe(15);
    expect(summary.monthTotalBudget).toBe(65);
    expect(summary.monthCompletedTasks).toBe(1);
    expect(summary.monthPendingTasks).toBe(1);
  });

  it('detects overdue items with occurrence dates for both standalone and recurring tasks', () => {
    const overdueList = getOverdueTaskItems(mockTasks, refDate);
    expect(overdueList.length).toBe(1);
    expect(overdueList[0].task.title).toBe('Pagar servicio de internet');
    expect(overdueList[0].occurrenceDate).toBe('2026-09-15');
    expect(overdueList[0].daysOverdue).toBe(3);
  });
});
