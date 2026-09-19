import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db.js';
import { notifyCalendarMembers } from '../_lib/email.js';
import type { DBTask } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDatabase();

  if (req.method === 'GET') {
    const calendarId = req.query.calendarId as string;

    if (hasPostgres) {
      try {
        const query = calendarId
          ? await sql`SELECT * FROM app_tasks WHERE calendar_id = ${calendarId} ORDER BY due_date ASC, due_time ASC;`
          : await sql`SELECT * FROM app_tasks ORDER BY due_date ASC, due_time ASC;`;
        return res.status(200).json(query.rows);
      } catch (err) {
        console.error('Postgres error in GET /api/tasks:', err);
      }
    }

    // Fallback to in-memory store
    const tasks = calendarId
      ? memoryStore.tasks.filter(t => t.calendar_id === calendarId)
      : memoryStore.tasks;
    return res.status(200).json(tasks);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const title = body.title;
    const description = body.description || '';
    const due_date = body.due_date || body.dueDate;
    const due_time = body.due_time !== undefined ? body.due_time : (body.dueTime || '');
    const amount = body.amount !== undefined && body.amount !== null && body.amount !== '' ? Number(body.amount) : null;
    const currency = body.currency || 'USD';
    const category = body.category || 'other';
    const calendar_id = body.calendar_id || body.calendarId || 'cal-shared-home';
    const created_by = body.created_by || body.createdBy || 'Jonathan.rendon@gmail.com';
    const assigned_to = body.assigned_to || body.assignedTo || '';
    const recurrence = body.recurrence || 'NONE';
    const recurrence_day = body.recurrence_day !== undefined ? body.recurrence_day : (body.recurrenceDay || null);

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due_date are required' });
    }

    const newTask: DBTask = {
      id: body.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      calendar_id,
      title,
      description,
      due_date,
      due_time,
      amount: amount !== null ? amount : undefined,
      currency,
      category,
      recurrence,
      recurrence_day: recurrence_day ? Number(recurrence_day) : undefined,
      completed_dates: [],
      status: 'PENDING',
      created_by,
      assigned_to,
      created_at: new Date().toISOString()
    };

    // Determine calendar members for notification
    let calendarName = 'Hogar & Finanzas Compartidas';
    let memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

function toPgTextArray(arr: any): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return '{}';
  }
  const clean = arr.map((x: any) => `"${String(x).replace(/"/g, '\\"')}"`);
  return `{${clean.join(',')}}`;
}

    if (hasPostgres) {
      try {
        const pgArrayLiteral = toPgTextArray(newTask.completed_dates);
        await sql`
          INSERT INTO app_tasks (
            id, calendar_id, title, description, due_date, due_time, amount, currency, category, recurrence, recurrence_day, completed_dates, status, created_by, assigned_to, created_at
          ) VALUES (
            ${newTask.id}, ${newTask.calendar_id}, ${newTask.title}, ${newTask.description || ''}, ${newTask.due_date},
            ${newTask.due_time || ''}, ${newTask.amount || null}, ${newTask.currency || 'USD'}, ${newTask.category},
            ${newTask.recurrence || 'NONE'}, ${newTask.recurrence_day || null}, ${pgArrayLiteral}::text[],
            ${newTask.status}, ${newTask.created_by}, ${newTask.assigned_to || ''}, ${newTask.created_at}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_date = EXCLUDED.due_date,
            due_time = EXCLUDED.due_time,
            amount = EXCLUDED.amount,
            category = EXCLUDED.category,
            recurrence = EXCLUDED.recurrence,
            recurrence_day = EXCLUDED.recurrence_day;
        `;

        const calRes = await sql`SELECT * FROM app_calendars WHERE id = ${calendar_id} LIMIT 1;`;
        if (calRes.rows.length > 0) {
          calendarName = calRes.rows[0].name || calendarName;
          const dbEmails = calRes.rows[0].member_emails;
          if (Array.isArray(dbEmails) && dbEmails.length > 0) {
            memberEmails = dbEmails;
          } else if (typeof dbEmails === 'string' && dbEmails.length > 0) {
            memberEmails = dbEmails.replace(/[{}]/g, '').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          }
        }
      } catch (err) {
        console.error('Postgres error in POST /api/tasks:', err);
      }
    }

    // Always update in-memory cache
    const existingMemIndex = memoryStore.tasks.findIndex(t => t.id === newTask.id);
    if (existingMemIndex !== -1) {
      memoryStore.tasks[existingMemIndex] = newTask;
    } else {
      memoryStore.tasks.push(newTask);
    }

    if (!memberEmails || memberEmails.length === 0) {
      memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];
    }

    // Send email notification to all members of the calendar (must await in serverless so Vercel does not freeze execution)
    try {
      const emailRes = await notifyCalendarMembers({
        type: 'CREATED',
        task: newTask,
        calendarName,
        recipients: memberEmails,
        actionBy: created_by
      });
      console.log('Task creation email result:', emailRes);
    } catch (e) {
      console.error('Error sending creation email:', e);
    }

    return res.status(201).json(newTask);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
