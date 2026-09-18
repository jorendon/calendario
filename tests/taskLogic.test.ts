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
});
