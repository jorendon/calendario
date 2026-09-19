import { describe, it, expect } from 'vitest';

function normalizeJsonTasks(rawTasks: any[], defaultCalendarId = 'cal-shared-home', defaultUser = 'Jonathan.rendon@gmail.com') {
  const result = [];
  for (const item of rawTasks) {
    if (!item) continue;
    const title = (item.title || item.titulo || item.name || item.nombre || item.task || '').trim();
    if (!title) continue;

    let rawDate = item.due_date || item.dueDate || item.due || item.fecha || item.date || item.fecha_vencimiento;
    let dueDate = '2026-09-25';
    if (rawDate) {
      dueDate = String(rawDate).split('T')[0];
    }

    const dueTime = item.due_time || item.dueTime || item.hora || '10:00';

    let amount: number | undefined = undefined;
    const rawAmount = item.amount ?? item.monto ?? item.valor ?? item.precio;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const parsed = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsed)) amount = parsed;
    }

    const category = (item.category || item.categoria || 'other').toLowerCase();
    const rawRecurrence = String(item.recurrence || item.recurrencia || item.repeticion || 'NONE').toUpperCase();
    let recurrence = 'NONE';
    if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(rawRecurrence)) {
      recurrence = rawRecurrence;
    } else if (rawRecurrence.includes('MENS')) {
      recurrence = 'MONTHLY';
    }

    result.push({
      title,
      due_date: dueDate,
      due_time: dueTime,
      amount,
      category,
      recurrence
    });
  }
  return result;
}

describe('JSON tasks import normalization', () => {
  it('normalizes Google Tasks Takeout format', () => {
    const googleTasksExport = [
      {
        id: 'gtask-1',
        title: 'Pagar tarjeta de crédito',
        notes: 'Banco de Occidente',
        due: '2026-09-25T00:00:00.000Z',
        status: 'needsAction'
      },
      {
        id: 'gtask-2',
        title: 'Comprar bombillos led',
        due: '2026-09-28T00:00:00.000Z'
      }
    ];

    const normalized = normalizeJsonTasks(googleTasksExport);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].title).toBe('Pagar tarjeta de crédito');
    expect(normalized[0].due_date).toBe('2026-09-25');
    expect(normalized[1].title).toBe('Comprar bombillos led');
    expect(normalized[1].due_date).toBe('2026-09-28');
  });

  it('normalizes custom Spanish format with amounts and recurrences', () => {
    const customSpanishTasks = [
      {
        titulo: 'Pagar la luz',
        monto: '$65.50',
        fecha: '2026-09-25',
        repeticion: 'mensual',
        categoria: 'servicios'
      },
      {
        titulo: 'Mercado mensual',
        valor: 150,
        fecha: '2026-09-20',
        categoria: 'comida'
      }
    ];

    const normalized = normalizeJsonTasks(customSpanishTasks);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].title).toBe('Pagar la luz');
    expect(normalized[0].amount).toBe(65.50);
    expect(normalized[0].recurrence).toBe('MONTHLY');
    expect(normalized[0].category).toBe('servicios');
    expect(normalized[1].amount).toBe(150);
  });
});
