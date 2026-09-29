import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db.js';
import { notifyCalendarMembers } from '../_lib/email.js';
import { parseGoogleTasksJson } from '../../src/utils/googleTasksParser.js';
import type { DBTask } from '../_lib/types.js';

function toPgTextArray(arr: any): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return '{}';
  }
  const clean = arr.map((x: any) => `"${String(x).replace(/"/g, '\\"')}"`);
  return `{${clean.join(',')}}`;
}

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

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const {
    calendar_id = 'cal-shared-home',
    user_email = 'Jonathan.rendon@gmail.com',
    user_name = '',
    tasks = []
  } = body;

  // Accept tasks array or direct Google Tasks Takeout root object
  let tasksToProcess: any = tasks;
  if ((!Array.isArray(tasks) || tasks.length === 0) && (body.items || body.recurrences || body.kind)) {
    tasksToProcess = body;
  }

  const parsed = parseGoogleTasksJson(tasksToProcess, {
    calendarId: calendar_id,
    defaultUser: user_email
  });

  if (!parsed || parsed.length === 0) {
    return res.status(400).json({ error: 'Debes enviar un JSON o array con tareas válidas.' });
  }

  const normalizedTasks: DBTask[] = parsed.map(item => ({
    id: item.id || `json-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    calendar_id,
    title: item.title,
    description: item.description || '',
    due_date: item.due_date,
    due_time: item.due_time || '10:00',
    amount: item.amount,
    currency: item.currency || 'USD',
    category: item.category,
    recurrence: item.recurrence || 'NONE',
    recurrence_day: item.recurrence_day,
    completed_dates: Array.isArray(item.completed_dates) ? item.completed_dates : [],
    status: item.status || 'PENDING',
    created_by: item.created_by || user_email,
    assigned_to: undefined,
    google_task_id: item.google_task_id,
    created_at: new Date().toISOString()
  }));

  // Insert into Postgres / memory
  let insertedCount = 0;
  for (const task of normalizedTasks) {
    if (hasPostgres) {
      try {
        const pgArrayLiteral = toPgTextArray(task.completed_dates);
        await sql`
          INSERT INTO app_tasks (
            id, calendar_id, title, description, due_date, due_time, amount, currency,
            category, recurrence, recurrence_day, completed_dates, status, created_by,
            assigned_to, google_task_id, created_at
          ) VALUES (
            ${task.id}, ${task.calendar_id}, ${task.title}, ${task.description || ''},
            ${task.due_date}, ${task.due_time || '10:00'}, ${task.amount !== undefined && task.amount !== null ? task.amount : null}, ${task.currency || 'USD'},
            ${task.category}, ${task.recurrence || 'NONE'}, ${task.recurrence_day || null},
            ${pgArrayLiteral}::text[], ${task.status}, ${task.created_by},
            ${task.assigned_to || null}, ${task.google_task_id || null}, ${task.created_at}
          ) ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_date = EXCLUDED.due_date,
            due_time = EXCLUDED.due_time,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            category = EXCLUDED.category,
            recurrence = EXCLUDED.recurrence,
            recurrence_day = EXCLUDED.recurrence_day,
            completed_dates = EXCLUDED.completed_dates,
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

  // Find calendar details and recipients
  let calendarName = 'Hogar & Finanzas Compartidas';
  let memberEmails: string[] = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

  if (hasPostgres && calendar_id) {
    try {
      const calResult = await sql`
        SELECT name, member_emails FROM app_calendars WHERE id = ${calendar_id} LIMIT 1;
      `;
      if (calResult.rows.length > 0) {
        if (calResult.rows[0].name) {
          calendarName = calResult.rows[0].name;
        }
        const dbEmails = calResult.rows[0].member_emails;
        if (Array.isArray(dbEmails) && dbEmails.length > 0) {
          memberEmails = dbEmails;
        } else if (typeof dbEmails === 'string' && dbEmails.length > 0) {
          memberEmails = dbEmails.replace(/[{}]/g, '').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      }
    } catch (err) {
      console.error('Error fetching calendar in /api/tasks/import:', err);
    }
  }

  if (!memberEmails || memberEmails.length === 0) {
    memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];
  }

  // Send ONE single bulk import summary email (no individual emails per task)
  let emailSent = false;
  try {
    const emailRes = await notifyCalendarMembers({
      type: 'BULK_IMPORT',
      tasks: normalizedTasks,
      calendarName,
      recipients: memberEmails,
      actionBy: user_name || user_email || 'Jonathan'
    });
    console.log('Bulk import summary email result:', emailRes);
    emailSent = Boolean(emailRes?.sent);
  } catch (e) {
    console.error('Error sending bulk import email:', e);
  }

  return res.status(200).json({
    success: true,
    count: normalizedTasks.length,
    inserted: insertedCount || normalizedTasks.length,
    emailSent,
    tasks: normalizedTasks
  });
}
