import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db.js';
import { notifyCalendarMembers } from '../_lib/email.js';
import type { DBTask } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow manual test triggering or Vercel Cron invocation
  await initDatabase();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  let pendingTasks: DBTask[] = [];

  if (hasPostgres) {
    try {
      const result = await sql`
        SELECT * FROM app_tasks
        WHERE status != 'DONE' AND due_date <= ${todayStr}
        ORDER BY due_date ASC;
      `;
      pendingTasks = result.rows as DBTask[];
    } catch (err) {
      console.error('Postgres error in /api/cron/reminders:', err);
    }
  }

  if (pendingTasks.length === 0) {
    // Fallback in-memory
    pendingTasks = memoryStore.tasks.filter(
      t => t.status !== 'DONE' && t.due_date <= todayStr
    );
  }

  if (pendingTasks.length === 0) {
    return res.status(200).json({
      message: 'No pending or overdue tasks for today. No emails sent.',
      date: todayStr
    });
  }

  // Group by calendar or send unified family email
  const recipients = ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'];

  // Add any extra members from active calendars
  for (const cal of memoryStore.calendars) {
    for (const email of cal.member_emails) {
      if (!recipients.includes(email)) {
        recipients.push(email);
      }
    }
  }

  const emailResult = await notifyCalendarMembers({
    type: 'REMINDER',
    tasks: pendingTasks,
    recipients,
    calendarName: 'Hogar & Finanzas Compartidas'
  });

  return res.status(200).json({
    message: `Morning reminder sent for ${pendingTasks.length} pending task(s)`,
    tasksCount: pendingTasks.length,
    recipients,
    emailResult
  });
}
