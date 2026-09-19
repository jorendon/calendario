import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db.js';
import type { DBUser } from '../_lib/types.js';

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
        const query = await sql`SELECT id, email, name, avatar_url, role, created_at FROM app_users ORDER BY created_at ASC;`;
        return res.status(200).json(query.rows);
      } catch (err) {
        console.error('Postgres error in GET /api/users:', err);
      }
    }

    const safeUsers = memoryStore.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar_url: u.avatar_url,
      role: u.role,
      created_at: u.created_at
    }));
    return res.status(200).json(safeUsers);
  }

  if (req.method === 'POST') {
    const { email, name, password = 'Calendario2006*', role = 'member' } = req.body || {};

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existsInMem = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existsInMem) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const newUser: DBUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      name: name.trim(),
      password_hash: password,
      role,
      created_at: new Date().toISOString()
    };

    if (hasPostgres) {
      try {
        await sql`
          INSERT INTO app_users (id, email, password_hash, name, role, created_at)
          VALUES (${newUser.id}, ${newUser.email}, ${newUser.password_hash}, ${newUser.name}, ${newUser.role}, ${newUser.created_at});
        `;
      } catch (err) {
        console.error('Postgres error in POST /api/users:', err);
      }
    }

    memoryStore.users.push(newUser);

    // Also auto-add new user to default shared calendar
    for (const cal of memoryStore.calendars) {
      if (cal.is_default && !cal.member_emails.includes(cleanEmail)) {
        cal.member_emails.push(cleanEmail);
      }
    }

    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      created_at: newUser.created_at
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
