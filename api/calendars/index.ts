import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase, toPgTextArray } from '../_lib/db.js';
import type { DBCalendar } from '../_lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDatabase();

  if (req.method === 'GET') {
    if (hasPostgres) {
      try {
        // Auto-recover any calendars that have tasks associated but were missing from app_calendars table
        try {
          const orphanCals = await sql`
            SELECT DISTINCT calendar_id
            FROM app_tasks
            WHERE calendar_id IS NOT NULL AND calendar_id != 'all' AND calendar_id NOT IN (SELECT id FROM app_calendars);
          `;
          for (const row of orphanCals.rows) {
            if (row.calendar_id) {
              const defaultName = 'Calendario de Tareas';
              const members = toPgTextArray(['Jonathan.rendon@gmail.com', 'michrotel@gmail.com']);
              await sql`
                INSERT INTO app_calendars (id, name, color, description, created_by, is_default, member_emails, created_at)
                VALUES (${row.calendar_id}, ${defaultName}, '#4f46e5', 'Calendario auto-recuperado', 'Jonathan.rendon@gmail.com', false, ${members}::text[], NOW())
                ON CONFLICT (id) DO NOTHING;
              `;
            }
          }
        } catch (recoverErr) {
          console.error('Error recovering orphan calendar IDs:', recoverErr);
        }

        const query = await sql`SELECT * FROM app_calendars ORDER BY created_at ASC;`;
        const unique = new Map<string, any>();
        for (const row of query.rows) {
          const key = (row.name || '').toLowerCase().trim();
          if (!unique.has(key) || row.is_default) {
            unique.set(key, row);
          }
        }
        return res.status(200).json(Array.from(unique.values()));
      } catch (err) {
        console.error('Postgres error in GET /api/calendars:', err);
      }
    }
    const memUnique = new Map<string, any>();
    for (const c of memoryStore.calendars) {
      const key = (c.name || '').toLowerCase().trim();
      if (!memUnique.has(key) || c.is_default) {
        memUnique.set(key, c);
      }
    }
    return res.status(200).json(Array.from(memUnique.values()));
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

    const { id, name, color = '#4f46e5', description = '', created_by = 'Jonathan.rendon@gmail.com', member_emails = [] } = body;

    if (!name) {
      return res.status(400).json({ error: 'Calendar name is required' });
    }

    // Always include Jonathan and Michelle by default in shared calendars
    const finalMembers = Array.from(new Set([
      'Jonathan.rendon@gmail.com',
      'michrotel@gmail.com',
      created_by,
      ...(Array.isArray(member_emails) ? member_emails : [])
    ].filter(Boolean)));

    const newCalendar: DBCalendar = {
      id: id || `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
        const pgEmails = toPgTextArray(newCalendar.member_emails);
        await sql`
          INSERT INTO app_calendars (id, name, color, description, created_by, is_default, member_emails, created_at)
          VALUES (${newCalendar.id}, ${newCalendar.name}, ${newCalendar.color}, ${newCalendar.description || ''}, ${newCalendar.created_by}, false, ${pgEmails}::text[], ${newCalendar.created_at})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            color = EXCLUDED.color,
            description = EXCLUDED.description,
            member_emails = EXCLUDED.member_emails;
        `;
      } catch (err) {
        console.error('Postgres error in POST /api/calendars:', err);
        return res.status(500).json({
          error: 'Error al persistir el calendario en Postgres: ' + ((err as any)?.message || String(err))
        });
      }
    }

    const existingIdx = memoryStore.calendars.findIndex(c => c.id === newCalendar.id);
    if (existingIdx >= 0) {
      memoryStore.calendars[existingIdx] = newCalendar;
    } else {
      memoryStore.calendars.push(newCalendar);
    }

    return res.status(201).json(newCalendar);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
