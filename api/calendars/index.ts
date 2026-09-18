import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db';
import { DBCalendar } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDatabase();

  if (req.method === 'GET') {
    if (hasPostgres) {
      try {
        const query = await sql`SELECT * FROM app_calendars ORDER BY created_at ASC;`;
        return res.status(200).json(query.rows);
      } catch (err) {
        console.error('Postgres error in GET /api/calendars:', err);
      }
    }
    return res.status(200).json(memoryStore.calendars);
  }

  if (req.method === 'POST') {
    const { name, color = '#4f46e5', description = '', created_by = 'Jonathan.rendon@gmail.com', member_emails = [] } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Calendar name is required' });
    }

    // Always include Jonathan and Michelle by default in shared calendars
    const finalMembers = Array.from(new Set([
      'Jonathan.rendon@gmail.com',
      'michrotel@gmail.com',
      created_by,
      ...member_emails
    ].filter(Boolean)));

    const newCalendar: DBCalendar = {
      id: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      color,
      description,
      created_by,
      is_default: false,
      member_emails: finalMembers,
      created_at: new Date().toISOString()
    };

    if (hasPostgres) {
      try {
        await sql`
          INSERT INTO app_calendars (id, name, color, description, created_by, is_default, member_emails, created_at)
          VALUES (${newCalendar.id}, ${newCalendar.name}, ${newCalendar.color}, ${newCalendar.description || ''}, ${newCalendar.created_by}, false, ${newCalendar.member_emails as any}, ${newCalendar.created_at});
        `;
      } catch (err) {
        console.error('Postgres error in POST /api/calendars:', err);
      }
    }

    memoryStore.calendars.push(newCalendar);
    return res.status(201).json(newCalendar);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
