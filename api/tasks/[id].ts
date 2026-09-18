import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db';
import { notifyCalendarMembers } from '../_lib/email';
import { DBTask } from '../_lib/types';

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
    const body = req.body || {};
    const { status, completed_by, title, description, due_date, due_time, amount, category } = body;

    let existingTask: DBTask | undefined = memoryStore.tasks.find(t => t.id === id);
    let calendarId = existingTask?.calendar_id || 'cal-shared-home';

    const isMarkingDone = status === 'DONE' && existingTask?.status !== 'DONE';
    const completedAt = isMarkingDone ? new Date().toISOString() : undefined;

    if (hasPostgres) {
      try {
        const check = await sql`SELECT * FROM app_tasks WHERE id = ${id} LIMIT 1;`;
        if (check.rows.length > 0) {
          const row = check.rows[0];
          calendarId = row.calendar_id;

          const updatedStatus = status !== undefined ? status : row.status;
          const updatedCompletedAt = status === 'DONE' ? (completedAt || new Date().toISOString()) : (status === 'PENDING' ? null : row.completed_at);
          const updatedCompletedBy = status === 'DONE' ? (completed_by || 'Usuario') : (status === 'PENDING' ? null : row.completed_by);
          const updatedTitle = title !== undefined ? title : row.title;
          const updatedDesc = description !== undefined ? description : row.description;
          const updatedDueDate = due_date !== undefined ? due_date : row.due_date;
          const updatedDueTime = due_time !== undefined ? due_time : row.due_time;
          const updatedAmount = amount !== undefined ? amount : row.amount;
          const updatedCategory = category !== undefined ? category : row.category;

          const updateRes = await sql`
            UPDATE app_tasks SET
              status = ${updatedStatus},
              completed_at = ${updatedCompletedAt},
              completed_by = ${updatedCompletedBy},
              title = ${updatedTitle},
              description = ${updatedDesc},
              due_date = ${updatedDueDate},
              due_time = ${updatedDueTime},
              amount = ${updatedAmount},
              category = ${updatedCategory}
            WHERE id = ${id}
            RETURNING *;
          `;
          existingTask = updateRes.rows[0] as DBTask;
        }
      } catch (err) {
        console.error('Postgres error in PATCH /api/tasks/[id]:', err);
      }
    }

    // Update in-memory
    const memIndex = memoryStore.tasks.findIndex(t => t.id === id);
    if (memIndex !== -1) {
      memoryStore.tasks[memIndex] = {
        ...memoryStore.tasks[memIndex],
        ...body,
        completed_at: status === 'DONE' ? (completedAt || new Date().toISOString()) : undefined,
        completed_by: status === 'DONE' ? (completed_by || 'Usuario') : undefined
      };
      existingTask = memoryStore.tasks[memIndex];
    }

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Send email notification if marked as completed
    if (isMarkingDone || status === 'DONE') {
      let calendarName = 'Hogar & Finanzas Compartidas';
      let memberEmails = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

      const inMemCal = memoryStore.calendars.find(c => c.id === calendarId);
      if (inMemCal) {
        calendarName = inMemCal.name;
        memberEmails = inMemCal.member_emails;
      }

      notifyCalendarMembers({
        type: 'COMPLETED',
        task: existingTask,
        calendarName,
        recipients: memberEmails,
        actionBy: completed_by || 'Jonathan o Michelle'
      }).catch(e => console.error('Error sending completion email:', e));
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
