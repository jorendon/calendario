import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hasPostgres, memoryStore } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const envKeys = Object.keys(process.env).sort();
  const dbRelatedKeys = envKeys.filter(k =>
    /postgres|database|prisma|neon|supabase|kv|storage|sql|url/i.test(k)
  );

  return res.status(200).json({
    hasPostgres,
    dbRelatedKeys,
    memoryTasksCount: memoryStore.tasks.length,
    memoryCalendarsCount: memoryStore.calendars.length,
    allEnvKeyCount: envKeys.length
  });
}
