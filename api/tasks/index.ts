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
    const body = req.body || {};
    const {
      title,
      description = '',
      due_date,
      due_time = '',
      amount = null,
      currency = 'USD',
      category = 'other',
      calendar_id = 'cal-shared-home',
      created_by = 'Jonathan.rendon@gmail.com',
      assigned_to = '',
      recurrence = 'NONE',
      recurrence_day = null
    } = body;

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due_date are required' });
    }

    const newTask: DBTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      calendar_id,
      title,
      description,
      due_date,
      due_time,
      amount: amount ? Number(amount) : undefined,
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

    if (hasPostgres) {
      try {
        await sql`
          INSERT INTO app_tasks (
            id, calendar_id, title, description, due_date, due_time, amount, currency, category, recurrence, recurrence_day, completed_dates, status, created_by, assigned_to, created_at
          ) VALUES (
            ${newTask.id}, ${newTask.calendar_id}, ${newTask.title}, ${newTask.description || ''}, ${newTask.due_date},
            ${newTask.due_time || ''}, ${newTask.amount || null}, ${newTask.currency || 'USD'}, ${newTask.category},
            ${newTask.recurrence || 'NONE'}, ${newTask.recurrence_day || null}, ${newTask.completed_dates as any || []},
            ${newTask.status}, ${newTask.created_by}, ${newTask.assigned_to || ''}, ${newTask.created_at}
          );
        `;

        const calRes = await sql`SELECT * FROM app_calendars WHERE id = ${calendar_id} LIMIT 1;`;
        if (calRes.rows.length > 0) {
          calendarName = calRes.rows[0].name;
          memberEmails = calRes.rows[0].member_emails || memberEmails;
        }
      } catch (err) {
        console.error('Postgres error in POST /api/tasks:', err);
      }
    }

    // Always update in-memory cache
    memoryStore.tasks.push(newTask);
    const inMemCal = memoryStore.calendars.find(c => c.id === calendar_id);
    if (inMemCal) {
      calendarName = inMemCal.name;
      memberEmails = inMemCal.member_emails;
    }

    // Send email notification to all members of the calendar (must await in serverless so Vercel does not freeze execution)
    try {
      await notifyCalendarMembers({
        type: 'CREATED',
        task: newTask,
        calendarName,
        recipients: memberEmails,
        actionBy: created_by
      });
    } catch (e) {
      console.error('Error sending creation email:', e);
    }

    return res.status(201).json(newTask);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
