import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db';
import { DBTask } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDatabase();

  const {
    calendar_id = 'cal-shared-home',
    user_email = 'Jonathan.rendon@gmail.com',
    tasks = []
  } = req.body || {};

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'Debes enviar un array de tareas válido.' });
  }

  const normalizedTasks: DBTask[] = [];

  for (const item of tasks) {
    if (!item) continue;
    
    // Normalize title
    const title = (item.title || item.titulo || item.name || item.nombre || item.task || '').trim();
    if (!title) continue;

    // Normalize date (format YYYY-MM-DD)
    let rawDate = item.due_date || item.dueDate || item.due || item.fecha || item.date || item.fecha_vencimiento;
    let dueDate = new Date().toISOString().split('T')[0];
    if (rawDate) {
      if (typeof rawDate === 'string') {
        dueDate = rawDate.split('T')[0];
      } else if (rawDate instanceof Date) {
        dueDate = rawDate.toISOString().split('T')[0];
      }
    }

    // Normalize time
    const dueTime = item.due_time || item.dueTime || item.hora || '10:00';

    // Normalize amount
    let amount: number | undefined = undefined;
    const rawAmount = item.amount ?? item.monto ?? item.valor ?? item.precio;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const parsed = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsed)) {
        amount = parsed;
      }
    }

    // Normalize category
    const category = (item.category || item.categoria || 'bills').toLowerCase();

    // Normalize recurrence
    const rawRecurrence = (item.recurrence || item.recurrencia || item.repeticion || 'NONE').toUpperCase();
    let recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'NONE';
    if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(rawRecurrence)) {
      recurrence = rawRecurrence as any;
    } else if (rawRecurrence.includes('DIAR') || rawRecurrence === 'DAY') {
      recurrence = 'DAILY';
    } else if (rawRecurrence.includes('SEMAN') || rawRecurrence === 'WEEK') {
      recurrence = 'WEEKLY';
    } else if (rawRecurrence.includes('MENS') || rawRecurrence === 'MONTH') {
      recurrence = 'MONTHLY';
    } else if (rawRecurrence.includes('ANUAL') || rawRecurrence === 'YEAR') {
      recurrence = 'YEARLY';
    }

    let recurrenceDay: number | undefined = undefined;
    if (recurrence === 'MONTHLY') {
      recurrenceDay = Number(item.recurrence_day || item.recurrenceDay || item.dia_repeticion) || (dueDate ? Number(dueDate.split('-')[2]) : 1);
    }

    // Normalize status
    const rawStatus = String(item.status || item.estado || '').toLowerCase();
    const isDone = rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'lista' || rawStatus === 'completada' || item.completed === true;
    const status: 'PENDING' | 'DONE' = isDone ? 'DONE' : 'PENDING';

    const newTask: DBTask = {
      id: item.id || `json-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      calendar_id: item.calendar_id || item.calendarId || calendar_id,
      title,
      description: item.description || item.descripcion || item.notes || item.notas || '',
      due_date: dueDate,
      due_time: dueTime,
      amount,
      currency: item.currency || 'USD',
      category,
      recurrence,
      recurrence_day: recurrenceDay,
      completed_dates: Array.isArray(item.completed_dates || item.completedDates) ? (item.completed_dates || item.completedDates) : [],
      status,
      created_by: item.created_by || item.createdBy || user_email,
      assigned_to: item.assigned_to || item.assignedTo || undefined,
      google_task_id: item.google_task_id || item.googleTaskId || (item.id && String(item.id).startsWith('google-') ? item.id : undefined),
      created_at: new Date().toISOString()
    };

    normalizedTasks.push(newTask);
  }

  // Insert into Postgres / memory
  let insertedCount = 0;
  for (const task of normalizedTasks) {
    if (hasPostgres) {
      try {
        await sql`
          INSERT INTO app_tasks (
            id, calendar_id, title, description, due_date, due_time, amount, currency,
            category, recurrence, recurrence_day, completed_dates, status, created_by,
            assigned_to, google_task_id, created_at
          ) VALUES (
            ${task.id}, ${task.calendar_id}, ${task.title}, ${task.description || ''},
            ${task.due_date}, ${task.due_time || ''}, ${task.amount || null}, ${task.currency || 'USD'},
            ${task.category}, ${task.recurrence || 'NONE'}, ${task.recurrence_day || null},
            ${task.completed_dates as any}, ${task.status}, ${task.created_by},
            ${task.assigned_to || null}, ${task.google_task_id || null}, ${task.created_at}
          ) ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            due_date = EXCLUDED.due_date,
            amount = EXCLUDED.amount,
            status = EXCLUDED.status;
        `;
        insertedCount++;
      } catch (err) {
        console.error('Error inserting task into Postgres:', err);
      }
    }

    // In-memory update
    const existingIndex = memoryStore.tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      memoryStore.tasks[existingIndex] = task;
    } else {
      memoryStore.tasks.push(task);
      if (!hasPostgres) insertedCount++;
    }
  }

  return res.status(200).json({
    success: true,
    count: normalizedTasks.length,
    inserted: insertedCount || normalizedTasks.length,
    tasks: normalizedTasks
  });
}
