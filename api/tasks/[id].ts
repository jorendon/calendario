import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db.js';
import { notifyCalendarMembers } from '../_lib/email.js';
import type { DBTask } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDatabase();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Valid task ID is required' });
  }

  if (req.method === 'PATCH') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    let existingTask: DBTask | undefined = undefined;

    if (hasPostgres) {
      try {
        const check = await sql`SELECT * FROM app_tasks WHERE id = ${id} LIMIT 1;`;
        if (check.rows.length > 0) {
          existingTask = check.rows[0] as DBTask;
        }
      } catch (err) {
        console.error('Postgres check error in PATCH /api/tasks/[id]:', err);
      }
    }

    if (!existingTask) {
      existingTask = memoryStore.tasks.find(t => t.id === id);
    }

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const prevStatus = existingTask.status;
    const prevCompletedDates = Array.isArray(existingTask.completed_dates) ? existingTask.completed_dates : [];

    const title = body.title !== undefined ? body.title : existingTask.title;
    const description = body.description !== undefined ? body.description : existingTask.description;
    const due_date = body.due_date || body.dueDate || existingTask.due_date;
    const due_time = body.due_time !== undefined ? body.due_time : (body.dueTime !== undefined ? body.dueTime : existingTask.due_time);
    const amount = body.amount !== undefined ? (body.amount !== '' && body.amount !== null ? Number(body.amount) : null) : existingTask.amount;
    const currency = body.currency || existingTask.currency || 'USD';
    const category = body.category || existingTask.category;
    const recurrence = body.recurrence !== undefined ? body.recurrence : existingTask.recurrence;
    const recurrence_day = body.recurrence_day !== undefined ? body.recurrence_day : (body.recurrenceDay !== undefined ? body.recurrenceDay : existingTask.recurrence_day);
    const assigned_to = body.assigned_to !== undefined ? body.assigned_to : (body.assignedTo !== undefined ? body.assignedTo : existingTask.assigned_to);

    const status = body.status !== undefined ? body.status : existingTask.status;
    const completed_dates = body.completed_dates !== undefined ? body.completed_dates : (body.completedDates !== undefined ? body.completedDates : (existingTask.completed_dates || []));
    const completed_by = body.completed_by || body.completedBy;

    // Accurate completion check
    const isRegularDone = status === 'DONE' && prevStatus !== 'DONE';
    const isRecurringDone = Array.isArray(completed_dates) && completed_dates.length > prevCompletedDates.length;
    const isMarkingDone = isRegularDone || isRecurringDone;

    const completedAt = isMarkingDone ? new Date().toISOString() : (status === 'PENDING' ? null : existingTask.completed_at);
    const completedBy = isMarkingDone ? (completed_by || 'Usuario') : (status === 'PENDING' ? null : existingTask.completed_by);

    if (hasPostgres) {
      try {
        const updateRes = await sql`
          UPDATE app_tasks SET
            status = ${status},
            completed_at = ${completedAt},
            completed_by = ${completedBy},
            title = ${title},
            description = ${description},
            due_date = ${due_date},
            due_time = ${due_time},
            amount = ${amount},
            currency = ${currency},
            category = ${category},
            completed_dates = ${completed_dates as any},
            recurrence = ${recurrence},
            recurrence_day = ${recurrence_day},
            assigned_to = ${assigned_to}
          WHERE id = ${id}
          RETURNING *;
        `;
        if (updateRes.rows.length > 0) {
          existingTask = updateRes.rows[0] as DBTask;
        }
      } catch (err) {
        console.error('Postgres update error in PATCH /api/tasks/[id]:', err);
      }
    }

    // Update in-memory store
    const memIndex = memoryStore.tasks.findIndex(t => t.id === id);
    if (memIndex !== -1) {
      memoryStore.tasks[memIndex] = {
        ...memoryStore.tasks[memIndex],
        ...existingTask,
        title,
        description,
        due_date,
        due_time,
        amount: amount !== null ? amount : undefined,
        currency,
        category,
        recurrence,
        recurrence_day: recurrence_day ? Number(recurrence_day) : undefined,
        status,
        completed_dates,
        completed_at: completedAt || undefined,
        completed_by: completedBy || undefined,
        assigned_to
      };
      existingTask = memoryStore.tasks[memIndex];
    } else if (existingTask) {
      memoryStore.tasks.push(existingTask);
    }

    // Send email notification if marked as completed
    if (isMarkingDone) {
      let calendarName = 'Hogar & Finanzas Compartidas';
      let memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

      if (hasPostgres && existingTask.calendar_id) {
        try {
          const calRes = await sql`SELECT * FROM app_calendars WHERE id = ${existingTask.calendar_id} LIMIT 1;`;
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
          console.error('Error fetching calendar in PATCH /api/tasks/[id]:', err);
        }
      }

      try {
        const emailRes = await notifyCalendarMembers({
          type: 'COMPLETED',
          task: existingTask,
          calendarName,
          recipients: memberEmails,
          actionBy: completedBy || completed_by || 'Jonathan o Michelle'
        });
        console.log('Task completion email result:', emailRes);
      } catch (e) {
        console.error('Error sending completion email:', e);
      }
    }

    return res.status(200).json(existingTask);
  }

  if (req.method === 'DELETE') {
    if (hasPostgres) {
      try {
        await sql`DELETE FROM app_tasks WHERE id = ${id};`;
      } catch (err) {
        console.error('Postgres error in DELETE /api/tasks/[id]:', err);
      }
    }

    memoryStore.tasks = memoryStore.tasks.filter(t => t.id !== id);
    return res.status(200).json({ success: true, id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
