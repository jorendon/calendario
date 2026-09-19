import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db.js';
import { notifyCalendarMembers } from '../_lib/email.js';
import type { DBTask } from '../_lib/types.js';

function toPgTextArray(arr: any): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return '{}';
  }
  const clean = arr.map((x: any) => `"${String(x).replace(/"/g, '\\"')}"`);
  return `{${clean.join(',')}}`;
}

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

    const id = (req.query.id as string) || body.id || (req.query.taskId as string);

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    let existingTask: DBTask | undefined = undefined;

    if (hasPostgres) {
      try {
        const check = await sql`SELECT * FROM app_tasks WHERE id = ${id} LIMIT 1;`;
        if (check.rows.length > 0) {
          existingTask = check.rows[0] as DBTask;
        }
      } catch (err) {
        console.error('Postgres check error in PATCH /api/tasks:', err);
      }
    }

    if (!existingTask) {
      existingTask = memoryStore.tasks.find(t => t.id === id);
    }

    if (!existingTask) {
      // Build task from body if not found in database (e.g. default tasks or offline creation)
      existingTask = {
        id,
        calendar_id: body.calendar_id || body.calendarId || 'cal-shared-home',
        title: body.title || 'Tarea',
        description: body.description || '',
        due_date: body.due_date || body.dueDate || new Date().toISOString().split('T')[0],
        due_time: body.due_time !== undefined ? body.due_time : (body.dueTime !== undefined ? body.dueTime : ''),
        amount: body.amount !== undefined && body.amount !== null && body.amount !== '' ? Number(body.amount) : undefined,
        currency: body.currency || 'USD',
        category: body.category || 'other',
        recurrence: body.recurrence || 'NONE',
        recurrence_day: body.recurrence_day !== undefined ? Number(body.recurrence_day) : (body.recurrenceDay !== undefined ? Number(body.recurrenceDay) : undefined),
        status: (body.status as any) || 'PENDING',
        completed_dates: Array.isArray(body.completed_dates) ? body.completed_dates : (Array.isArray(body.completedDates) ? body.completedDates : []),
        created_by: body.created_by || body.createdBy || 'Jonathan.rendon@gmail.com',
        assigned_to: body.assigned_to || body.assignedTo || '',
        created_at: new Date().toISOString()
      };
    }

    const prevStatus = existingTask.status;
    const prevCompletedDates = Array.isArray(existingTask.completed_dates) ? existingTask.completed_dates : [];

    const title = body.title !== undefined ? body.title : existingTask.title;
    const description = body.description !== undefined ? body.description : (existingTask.description || '');
    const due_date = body.due_date || body.dueDate || existingTask.due_date || new Date().toISOString().split('T')[0];
    const due_time = (body.due_time !== undefined ? body.due_time : (body.dueTime !== undefined ? body.dueTime : existingTask.due_time)) || '';
    const rawAmount = body.amount !== undefined ? (body.amount !== '' && body.amount !== null ? Number(body.amount) : null) : (existingTask.amount !== undefined ? existingTask.amount : null);
    const amount = rawAmount !== null && !isNaN(Number(rawAmount)) ? Number(rawAmount) : null;
    const currency = body.currency || existingTask.currency || 'USD';
    const category = body.category || existingTask.category || 'other';
    const recurrence = body.recurrence !== undefined ? body.recurrence : (existingTask.recurrence || 'NONE');
    const recurrence_day = body.recurrence_day !== undefined ? (body.recurrence_day !== null && body.recurrence_day !== '' ? Number(body.recurrence_day) : null) : (body.recurrenceDay !== undefined ? (body.recurrenceDay !== null && body.recurrenceDay !== '' ? Number(body.recurrenceDay) : null) : (existingTask.recurrence_day !== undefined ? existingTask.recurrence_day : null));
    const assigned_to = (body.assigned_to !== undefined ? body.assigned_to : (body.assignedTo !== undefined ? body.assignedTo : existingTask.assigned_to)) || '';
    const calendar_id = existingTask.calendar_id || body.calendar_id || body.calendarId || 'cal-shared-home';

    const status = body.status !== undefined ? body.status : existingTask.status;
    const completed_dates = body.completed_dates !== undefined ? body.completed_dates : (body.completedDates !== undefined ? body.completedDates : (existingTask.completed_dates || []));
    const completed_by = body.completed_by || body.completedBy;

    // Detect action: completion, reopening, or edit
    const bodyAction = body.action as string | undefined;
    const isRegularDone = status === 'DONE' && prevStatus !== 'DONE';
    const isRecurringDone = Array.isArray(completed_dates) && completed_dates.length > prevCompletedDates.length;
    const isDone = isRegularDone || isRecurringDone;

    const isRegularReopened = status === 'PENDING' && prevStatus === 'DONE';
    const isRecurringReopened = Array.isArray(completed_dates) && completed_dates.length < prevCompletedDates.length;
    const isReopened = isRegularReopened || isRecurringReopened;

    let notificationType: 'COMPLETED' | 'REOPENED' | 'EDITED' | null = null;
    if (bodyAction === 'COMPLETED' || isDone) {
      notificationType = 'COMPLETED';
    } else if (bodyAction === 'REOPENED' || isReopened) {
      notificationType = 'REOPENED';
    } else if (bodyAction === 'EDITED' || (body.title !== undefined || body.amount !== undefined || body.due_date !== undefined || body.description !== undefined)) {
      notificationType = 'EDITED';
    }

    const completedAt = (notificationType === 'COMPLETED' || isDone)
      ? new Date().toISOString()
      : (status === 'PENDING' ? null : existingTask.completed_at);
    const completedBy = (notificationType === 'COMPLETED' || isDone)
      ? (completed_by || 'Usuario')
      : (status === 'PENDING' ? null : existingTask.completed_by);

    if (hasPostgres) {
      try {
        const pgArrayLiteral = toPgTextArray(completed_dates);
        const updateRes = await sql`
          INSERT INTO app_tasks (
            id, calendar_id, title, description, due_date, due_time, amount, currency, category, recurrence, recurrence_day, completed_dates, status, completed_at, completed_by, created_by, assigned_to
          ) VALUES (
            ${id}, ${calendar_id}, ${title}, ${description}, ${due_date},
            ${due_time}, ${amount}, ${currency}, ${category},
            ${recurrence}, ${recurrence_day}, ${pgArrayLiteral}::text[],
            ${status}, ${completedAt || null}, ${completedBy || null}, ${existingTask.created_by || 'Jonathan.rendon@gmail.com'}, ${assigned_to}
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            completed_at = EXCLUDED.completed_at,
            completed_by = EXCLUDED.completed_by,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            due_date = EXCLUDED.due_date,
            due_time = EXCLUDED.due_time,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            category = EXCLUDED.category,
            completed_dates = EXCLUDED.completed_dates,
            recurrence = EXCLUDED.recurrence,
            recurrence_day = EXCLUDED.recurrence_day,
            assigned_to = EXCLUDED.assigned_to
          RETURNING *;
        `;
        if (updateRes.rows.length > 0) {
          existingTask = updateRes.rows[0] as DBTask;
        }
      } catch (err) {
        console.error('Postgres update error in PATCH /api/tasks:', err);
      }
    }

    // Update in-memory store
    const updatedRecord: DBTask = {
      ...existingTask,
      title,
      description,
      due_date,
      due_time,
      amount: amount !== null ? amount : undefined,
      currency,
      category,
      recurrence,
      recurrence_day: recurrence_day !== null ? Number(recurrence_day) : undefined,
      status,
      completed_dates,
      completed_at: completedAt || undefined,
      completed_by: completedBy || undefined,
      calendar_id,
      assigned_to
    };

    const memIndex = memoryStore.tasks.findIndex(t => t.id === id);
    if (memIndex !== -1) {
      memoryStore.tasks[memIndex] = updatedRecord;
    } else {
      memoryStore.tasks.push(updatedRecord);
    }
    existingTask = updatedRecord;

    // Send email notification if marked as completed, reopened, or edited
    if (notificationType) {
      let calendarName = 'Hogar & Finanzas Compartidas';
      let memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

      if (hasPostgres && calendar_id) {
        try {
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
          console.error('Error fetching calendar in PATCH /api/tasks:', err);
        }
      }

      if (!memberEmails || memberEmails.length === 0) {
        memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];
      }

      try {
        const emailRes = await notifyCalendarMembers({
          type: notificationType,
          task: existingTask,
          calendarName,
          recipients: memberEmails,
          actionBy: completedBy || completed_by || body.updated_by || 'Jonathan o Michelle'
        });
        console.log(`Task ${notificationType} email result in /api/tasks:`, emailRes);
      } catch (e) {
        console.error(`Error sending ${notificationType} email:`, e);
      }
    }

    return res.status(200).json(existingTask);
  }

  if (req.method === 'DELETE') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const id = (req.query.id as string) || body.id || (req.query.taskId as string);
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    let taskToDelete: DBTask | undefined = body.task;

    if (hasPostgres) {
      try {
        const check = await sql`SELECT * FROM app_tasks WHERE id = ${id} LIMIT 1;`;
        if (check.rows.length > 0) {
          taskToDelete = { ...(check.rows[0] as DBTask), ...(taskToDelete || {}) };
        }
        await sql`DELETE FROM app_tasks WHERE id = ${id};`;
      } catch (err) {
        console.error('Postgres error in DELETE /api/tasks:', err);
      }
    }

    if (!taskToDelete) {
      taskToDelete = memoryStore.tasks.find(t => t.id === id);
    }

    memoryStore.tasks = memoryStore.tasks.filter(t => t.id !== id);

    // Send email notification for task deletion!
    if (taskToDelete && taskToDelete.title) {
      let calendarName = 'Hogar & Finanzas Compartidas';
      let memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

      const calId = taskToDelete.calendar_id || 'cal-shared-home';
      if (hasPostgres && calId) {
        try {
          const calRes = await sql`SELECT * FROM app_calendars WHERE id = ${calId} LIMIT 1;`;
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
          console.error('Error fetching calendar in DELETE /api/tasks:', err);
        }
      }

      if (!memberEmails || memberEmails.length === 0) {
        memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];
      }

      try {
        const emailRes = await notifyCalendarMembers({
          type: 'DELETED',
          task: taskToDelete,
          calendarName,
          recipients: memberEmails,
          actionBy: body.deleted_by || body.deletedBy || 'Jonathan o Michelle'
        });
        console.log('Task DELETED email result in /api/tasks:', emailRes);
      } catch (e) {
        console.error('Error sending DELETED email:', e);
      }
    }

    return res.status(200).json({ success: true, message: 'Task deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
