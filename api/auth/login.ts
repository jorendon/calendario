import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDatabase();

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check in Postgres if connected
  if (hasPostgres) {
    try {
      const result = await sql`
        SELECT id, email, password_hash, name, avatar_url, role
        FROM app_users
        WHERE LOWER(email) = ${cleanEmail}
        LIMIT 1;
      `;

      if (result.rows.length > 0) {
        const user = result.rows[0];
        // Check password (direct match or default password)
        if (user.password_hash === password || (password === 'Calendario2006*' && (cleanEmail === 'jonathan.rendon@gmail.com' || cleanEmail === 'michrotel@gmail.com'))) {
          return res.status(200).json({
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar_url: user.avatar_url,
              role: user.role
            },
            token: `token-${user.id}-${Date.now()}`
          });
        } else {
          return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
      }
    } catch (err) {
      console.error('Postgres error in /api/auth/login:', err);
    }
  }

  // 2. Check in memory fallback
  const memUser = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    if (memUser.password_hash === password || (password === 'Calendario2006*' && (cleanEmail === 'jonathan.rendon@gmail.com' || cleanEmail === 'michrotel@gmail.com'))) {
      return res.status(200).json({
        user: {
          id: memUser.id,
          email: memUser.email,
          name: memUser.name,
          avatar_url: memUser.avatar_url,
          role: memUser.role
        },
        token: `token-${memUser.id}-${Date.now()}`
      });
    }
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  return res.status(404).json({ error: 'Usuario no encontrado. Pídele al administrador que te agregue a la app.' });
}
