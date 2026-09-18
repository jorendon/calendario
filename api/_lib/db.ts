import { sql } from '@vercel/postgres';
import { DBUser, DBCalendar, DBTask } from './types';

// In-memory store fallback for local development or when Vercel Postgres is not yet connected
interface InMemoryStore {
  users: DBUser[];
  calendars: DBCalendar[];
  tasks: DBTask[];
}

const DEFAULT_USERS: DBUser[] = [
  {
    id: 'user-jonathan',
    email: 'Jonathan.rendon@gmail.com',
    password_hash: 'Calendario2006*', // Plain/hash checked in auth
    name: 'Jonathan Rendón',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'user-michelle',
    email: 'michrotel@gmail.com',
    password_hash: 'Calendario2006*',
    name: 'Michelle',
    role: 'admin',
    created_at: new Date().toISOString()
  }
];

const DEFAULT_CALENDARS: DBCalendar[] = [
  {
    id: 'cal-shared-home',
    name: 'Hogar & Finanzas Compartidas',
    color: '#4f46e5',
    description: 'Calendario principal compartido para renta, facturas y tareas del hogar',
    created_by: 'Jonathan.rendon@gmail.com',
    is_default: true,
    member_emails: ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'],
    created_at: new Date().toISOString()
  }
];

// Helper to get current YYYY-MM-DD
function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_TASKS: DBTask[] = [
  {
    id: 'task-rent-sample',
    calendar_id: 'cal-shared-home',
    title: 'Pagar la renta del mes',
    description: 'Hacer la transferencia bancaria de la renta',
    due_date: getTodayISO(),
    due_time: '09:00',
    amount: 1800,
    currency: 'USD',
    category: 'rent',
    status: 'PENDING',
    created_by: 'Jonathan.rendon@gmail.com',
    created_at: new Date().toISOString()
  },
  {
    id: 'task-internet-sample',
    calendar_id: 'cal-shared-home',
    title: 'Pagar servicio de Internet y Luz',
    description: 'Factura mensual de servicios del hogar',
    due_date: getTodayISO(),
    due_time: '12:00',
    amount: 120,
    currency: 'USD',
    category: 'bills',
    status: 'PENDING',
    created_by: 'michrotel@gmail.com',
    created_at: new Date().toISOString()
  }
];

// Global in-memory cache for serverless invocation lifecycle fallback
declare global {
  // eslint-disable-next-line no-var
  var __calendarioInMemory: InMemoryStore | undefined;
}

if (!global.__calendarioInMemory) {
  global.__calendarioInMemory = {
    users: [...DEFAULT_USERS],
    calendars: [...DEFAULT_CALENDARS],
    tasks: [...DEFAULT_TASKS]
  };
}

export const memoryStore = global.__calendarioInMemory;

export const hasPostgres = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);

/**
 * Ensures tables exist in Vercel Postgres if connected
 */
export async function initDatabase() {
  if (!hasPostgres) {
    return { status: 'in-memory-fallback', message: 'Using in-memory store. Connect Vercel Postgres in production.' };
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'member',
        google_refresh_token TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS app_calendars (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT '#4f46e5',
        description TEXT,
        created_by VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        member_emails TEXT[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS app_tasks (
        id VARCHAR(100) PRIMARY KEY,
        calendar_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date VARCHAR(20) NOT NULL,
        due_time VARCHAR(10),
        amount NUMERIC(12, 2),
        currency VARCHAR(10) DEFAULT 'USD',
        category VARCHAR(50) DEFAULT 'other',
        status VARCHAR(20) DEFAULT 'PENDING',
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by VARCHAR(255),
        created_by VARCHAR(255) NOT NULL,
        assigned_to VARCHAR(255),
        google_task_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default users if not exists
    for (const u of DEFAULT_USERS) {
      await sql`
        INSERT INTO app_users (id, email, password_hash, name, role)
        VALUES (${u.id}, ${u.email}, ${u.password_hash}, ${u.name}, ${u.role})
        ON CONFLICT (email) DO NOTHING;
      `;
    }

    // Seed default calendar if not exists
    for (const c of DEFAULT_CALENDARS) {
      await sql`
        INSERT INTO app_calendars (id, name, color, description, created_by, is_default, member_emails)
        VALUES (${c.id}, ${c.name}, ${c.color}, ${c.description}, ${c.created_by}, ${c.is_default}, ${c.member_emails as any})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    return { status: 'postgres-connected', message: 'Vercel Postgres tables initialized successfully.' };
  } catch (error) {
    console.error('Error initializing Postgres tables:', error);
    return { status: 'error', error: String(error) };
  }
}
