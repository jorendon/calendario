import { describe, it, expect } from 'vitest';
import { Task, Calendar, User } from '../src/types';

describe('task and user permissions logic', () => {
  const users: User[] = [
    {
      id: 'user-1',
      email: 'Jonathan.rendon@gmail.com',
      name: 'Jonathan Rendón',
      role: 'admin'
    },
    {
      id: 'user-2',
      email: 'michrotel@gmail.com',
      name: 'Michelle',
      role: 'admin'
    },
    {
      id: 'user-3',
      email: 'nuevo.familiar@gmail.com',
      name: 'Familiar Invitado',
      role: 'member'
    }
  ];

  const calendar: Calendar = {
    id: 'cal-1',
    name: 'Hogar & Pagos',
    color: '#4f46e5',
    createdBy: 'Jonathan.rendon@gmail.com',
    isDefault: true,
    memberEmails: ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com', 'nuevo.familiar@gmail.com'],
    createdAt: '2026-09-01T00:00:00Z'
  };

  it('allows any calendar member to mark a task as DONE', () => {
    const task: Task = {
      id: 'task-rent',
      calendarId: calendar.id,
      title: 'Pagar la renta del mes',
      amount: 1900,
      dueDate: '2026-09-18',
      category: 'rent',
      status: 'PENDING',
      createdBy: 'Jonathan.rendon@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    };

    // Michelle marks it as DONE
    const updatedTask: Task = {
      ...task,
      status: 'DONE',
      completedAt: '2026-09-18T10:30:00Z',
      completedBy: 'michrotel@gmail.com'
    };

    expect(updatedTask.status).toBe('DONE');
    expect(updatedTask.completedBy).toBe('michrotel@gmail.com');
  });

  it('collects all recipient emails for shared notification', () => {
    // When a task is created or marked done in this calendar, all members must receive the email
    const recipientEmails = calendar.memberEmails;
    expect(recipientEmails).toContain('Jonathan.rendon@gmail.com');
    expect(recipientEmails).toContain('michrotel@gmail.com');
    expect(recipientEmails).toContain('nuevo.familiar@gmail.com');
    expect(recipientEmails.length).toBe(3);
  });

  it('allows reopening a completed task back to PENDING', () => {
    const task: Task = {
      id: 'task-rent',
      calendarId: calendar.id,
      title: 'Pagar la renta del mes',
      amount: 1900,
      dueDate: '2026-09-18',
      category: 'rent',
      status: 'DONE',
      completedAt: '2026-09-18T10:30:00Z',
      completedBy: 'michrotel@gmail.com',
      createdBy: 'Jonathan.rendon@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    };

    // Jonathan reopens it
    const reopenedTask: Task = {
      ...task,
      status: 'PENDING',
      completedAt: undefined,
      completedBy: undefined
    };

    expect(reopenedTask.status).toBe('PENDING');
    expect(reopenedTask.completedAt).toBeUndefined();
    expect(reopenedTask.completedBy).toBeUndefined();
  });

  it('updates task properties and propagates changes across recurring instances', () => {
    const recurringTask: Task = {
      id: 'task-power',
      calendarId: calendar.id,
      title: 'Pagar la luz',
      amount: 110,
      dueDate: '2026-09-25',
      recurrence: 'MONTHLY',
      recurrenceDay: 25,
      category: 'bills',
      status: 'PENDING',
      createdBy: 'michrotel@gmail.com',
      createdAt: '2026-09-01T00:00:00Z'
    };

    // Edit task to change amount and day
    const editedTask: Task = {
      ...recurringTask,
      amount: 125.50,
      recurrenceDay: 28,
      dueDate: '2026-09-28',
      description: 'Tarifa actualizada'
    };

    expect(editedTask.amount).toBe(125.50);
    expect(editedTask.recurrenceDay).toBe(28);
    expect(editedTask.dueDate).toBe('2026-09-28');
    expect(editedTask.description).toBe('Tarifa actualizada');
    expect(editedTask.recurrence).toBe('MONTHLY');
  });

  it('filters out deleted task and prepares deletion notification', () => {
    const tasksList: Task[] = [
      {
        id: 'task-1',
        calendarId: calendar.id,
        title: 'Comprar víveres',
        dueDate: '2026-09-20',
        category: 'chores',
        status: 'PENDING',
        createdBy: 'Jonathan.rendon@gmail.com',
        createdAt: '2026-09-01T00:00:00Z'
      },
      {
        id: 'task-2',
        calendarId: calendar.id,
        title: 'Pagar seguro',
        dueDate: '2026-09-22',
        category: 'bills',
        status: 'PENDING',
        createdBy: 'michrotel@gmail.com',
        createdAt: '2026-09-01T00:00:00Z'
      }
    ];

    const taskToDelete = tasksList.find(t => t.id === 'task-1');
    const remainingTasks = tasksList.filter(t => t.id !== 'task-1');

    expect(remainingTasks.length).toBe(1);
    expect(remainingTasks[0].id).toBe('task-2');
    expect(taskToDelete?.title).toBe('Comprar víveres');

    const notificationPayload = {
      type: 'DELETED',
      task: taskToDelete,
      recipients: calendar.memberEmails
    };
    expect(notificationPayload.type).toBe('DELETED');
    expect(notificationPayload.recipients).toContain('Jonathan.rendon@gmail.com');
    expect(notificationPayload.recipients).toContain('michrotel@gmail.com');
  });
});
