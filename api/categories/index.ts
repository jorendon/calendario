import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { memoryStore, hasPostgres, initDatabase } from '../_lib/db';
import { DBCategory } from '../_lib/types';

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
        const query = await sql`SELECT * FROM app_categories ORDER BY created_at ASC;`;
        if (query.rows.length > 0) {
          return res.status(200).json(query.rows);
        }
      } catch (err) {
        console.error('Postgres error in GET /api/categories:', err);
      }
    }
    return res.status(200).json(memoryStore.categories);
  }

  if (req.method === 'POST') {
    const { name, icon = '📌', color = '#6366f1', created_by = 'Jonathan.rendon@gmail.com' } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const newCategory: DBCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      icon: icon.trim() || '📌',
      color,
      created_by,
      created_at: new Date().toISOString()
    };

    if (hasPostgres) {
      try {
        await sql`
          INSERT INTO app_categories (id, name, icon, color, created_by, created_at)
          VALUES (${newCategory.id}, ${newCategory.name}, ${newCategory.icon}, ${newCategory.color}, ${newCategory.created_by}, ${newCategory.created_at});
        `;
      } catch (err) {
        console.error('Postgres error in POST /api/categories:', err);
      }
    }

    memoryStore.categories.push(newCategory);
    return res.status(201).json(newCategory);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
