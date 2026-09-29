import { describe, it, expect } from 'vitest';
import { parseGoogleTasksJson, extractAmount } from '../src/utils/googleTasksParser';

describe('JSON tasks import normalization', () => {
  it('extracts amounts correctly from various currency string formats', () => {
    expect(extractAmount('Capital One ARR $176.37')).toBe(176.37);
    expect(extractAmount('Automatico cuenta wells fargo $90.26')).toBe(90.26);
    expect(extractAmount('Klarna 56.07')).toBe(56.07);
    expect(extractAmount('$3800.00 se paga desde cuenta de ahorros')).toBe(3800);
    expect(extractAmount('$36,05 automático Bank of America')).toBe(36.05);
    expect(extractAmount('Pago $5.00 TDC Michelle')).toBe(5.00);
    expect(extractAmount('Pago $100 syncrhorny bank')).toBe(100);
    expect(extractAmount('Pago Airbnb $419')).toBe(419);
  });

  it('normalizes Google Tasks Takeout JSON with recurrences and historical completed instances', () => {
    const googleTasksTakeout = {
      kind: 'tasks#taskLists',
      items: [
        {
          id: 'list-michelle',
          title: "MICHELLE's list",
          recurrences: [
            {
              id: 'rec-infinity',
              title: 'Infinity Insurance',
              schedule: {
                first_instance_date: '2025-02-26T00:00:00Z',
                interval: {
                  interval_multiplier: 1,
                  monthly: { day_of_month: 26 }
                }
              }
            },
            {
              id: 'rec-preply',
              title: 'Preply',
              schedule: {
                first_instance_date: '2025-03-12T00:00:00Z',
                interval: {
                  interval_multiplier: 1,
                  monthly: { day_of_month: 12 }
                }
              }
            }
          ],
          items: [
            {
              id: 'inst-preply-active',
              title: 'Preply',
              notes: 'Capital One ARR $168.00',
              scheduled_time: [{ current: true, start: '2026-09-27T04:00:00Z' }],
              task_recurrence_id: 'rec-preply',
              status: 'needsAction'
            },
            {
              id: 'inst-preply-past-1',
              title: 'Preply',
              notes: 'Capital One ARR $168.00',
              scheduled_time: [{ current: true, start: '2026-08-28T04:00:00Z' }],
              task_recurrence_id: 'rec-preply',
              completed: '2026-09-02T20:28:34.190Z',
              status: 'completed'
            },
            {
              id: 'inst-infinity-past-1',
              title: 'Infinity Insurance',
              notes: 'Capital One ARR $176.37',
              scheduled_time: [{ current: true, start: '2026-08-26T04:00:00Z' }],
              task_recurrence_id: 'rec-infinity',
              status: 'completed'
            },
            {
              id: 'inst-standalone-klarna',
              title: 'Klarna 56.07',
              scheduled_time: [{ current: true, start: '2026-10-16T04:00:00Z' }],
              status: 'needsAction'
            },
            {
              id: 'inst-empty-title',
              title: '',
              status: 'needsAction'
            }
          ]
        }
      ]
    };

    const parsed = parseGoogleTasksJson(googleTasksTakeout);

    // Should create 2 recurring tasks + 1 standalone task = 3 tasks (empty title ignored)
    expect(parsed).toHaveLength(3);

    const preplyTask = parsed.find(t => t.title === 'Preply');
    expect(preplyTask).toBeDefined();
    expect(preplyTask?.recurrence).toBe('MONTHLY');
    expect(preplyTask?.recurrence_day).toBe(12);
    expect(preplyTask?.amount).toBe(168.00);
    expect(preplyTask?.description).toBe('Capital One ARR $168.00');
    expect(preplyTask?.status).toBe('PENDING'); // because of needsAction
    expect(preplyTask?.completed_dates).toContain('2026-08-28');

    const infinityTask = parsed.find(t => t.title === 'Infinity Insurance');
    expect(infinityTask).toBeDefined();
    expect(infinityTask?.recurrence).toBe('MONTHLY');
    expect(infinityTask?.recurrence_day).toBe(26);
    expect(infinityTask?.amount).toBe(176.37);
    expect(infinityTask?.completed_dates).toContain('2026-08-26');

    const klarnaTask = parsed.find(t => t.title === 'Klarna 56.07');
    expect(klarnaTask).toBeDefined();
    expect(klarnaTask?.recurrence).toBe('NONE');
    expect(klarnaTask?.amount).toBe(56.07);
    expect(klarnaTask?.due_date).toBe('2026-10-16');
    expect(klarnaTask?.status).toBe('PENDING');
  });

  it('correctly parses complex Google Tasks with multiple recurrences, notes with amounts and historical completions', () => {
    const sample = {
      kind: 'tasks#taskLists',
      items: [
        {
          id: 'list-1',
          title: "MICHELLE's list",
          recurrences: [
            {
              id: 'rec-1',
              title: 'Camioneta',
              schedule: {
                interval: { monthly: { day_of_month: 21 } }
              }
            },
            {
              id: 'rec-2',
              title: 'Pago Mortgage de la casa',
              schedule: {
                interval: { monthly: { day_of_month: 1 } }
              }
            }
          ],
          items: [
            {
              id: 'item-1',
              title: 'Camioneta',
              notes: 'Pago de camioneta \n\nMichrotel\nAndres*23\n\n$603.87  se paga con la cuenta de wells fargo\n',
              scheduled_time: [{ start: '2026-09-21T04:00:00Z' }],
              task_recurrence_id: 'rec-1',
              status: 'completed'
            },
            {
              id: 'item-2',
              title: 'Pago Mortgage de la casa',
              notes: '$3800.00 se paga desde cuenta de ahorros Bank of America ',
              scheduled_time: [{ start: '2026-09-01T04:00:00Z' }],
              task_recurrence_id: 'rec-2',
              status: 'completed'
            },
            {
              id: 'item-3',
              title: 'Pago Airbnb $419',
              scheduled_time: [{ start: '2026-08-28T04:00:00Z' }],
              status: 'completed'
            }
          ]
        }
      ]
    };

    const result = parseGoogleTasksJson(sample);
    expect(result).toHaveLength(3);

    const camioneta = result.find(t => t.title === 'Camioneta');
    expect(camioneta?.amount).toBe(603.87);
    expect(camioneta?.recurrence).toBe('MONTHLY');
    expect(camioneta?.recurrence_day).toBe(21);

    const mortgage = result.find(t => t.title === 'Pago Mortgage de la casa');
    expect(mortgage?.amount).toBe(3800);
    expect(mortgage?.category).toBe('rent');
    expect(mortgage?.recurrence_day).toBe(1);

    const airbnb = result.find(t => t.title === 'Pago Airbnb $419');
    expect(airbnb?.amount).toBe(419);
    expect(airbnb?.recurrence).toBe('NONE');
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

    const normalized = parseGoogleTasksJson(customSpanishTasks);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].title).toBe('Pagar la luz');
    expect(normalized[0].amount).toBe(65.50);
    expect(normalized[0].recurrence).toBe('MONTHLY');
    expect(normalized[0].category).toBe('servicios');
    expect(normalized[1].amount).toBe(150);
  });

  it('parses actual uploaded Takeout export if available', async () => {
    const fs = await import('fs');
    const path = '/Users/jonathan/.gemini/antigravity/brain/d0b8ae7b-b8d4-4b9f-9871-2fdb4e3b5c70/.user_uploaded/media_1790689655704.json';
    if (!fs.existsSync(path)) return;

    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const parsed = parseGoogleTasksJson(data);

    expect(parsed.length).toBeGreaterThanOrEqual(49);
    const recurring = parsed.filter(t => t.recurrence && t.recurrence !== 'NONE');
    expect(recurring.length).toBe(49);

    // Verify some specific tasks from user's list
    const preply = parsed.find(t => t.title === 'Preply');
    expect(preply).toBeDefined();
    expect(preply?.recurrence).toBe('MONTHLY');
    expect(preply?.recurrence_day).toBe(12);

    const infinity = parsed.find(t => t.title === 'Infinity Insurance');
    expect(infinity).toBeDefined();
    expect(infinity?.recurrence).toBe('MONTHLY');
    expect(infinity?.recurrence_day).toBe(26);

    const camioneta = parsed.find(t => t.title.toLowerCase().includes('camioneta'));
    expect(camioneta).toBeDefined();

    console.log(`Successfully parsed user file: Total tasks = ${parsed.length} (${recurring.length} recurring, ${parsed.length - recurring.length} standalone)`);
  });

  it('marks all recurring occurrences up to September as done and leaves October pending when using all_up_to_current_month_done', async () => {
    const fs = await import('fs');
    const path = '/Users/jonathan/.gemini/antigravity/brain/d0b8ae7b-b8d4-4b9f-9871-2fdb4e3b5c70/.user_uploaded/media_1790689655704.json';
    if (!fs.existsSync(path)) return;

    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const parsed = parseGoogleTasksJson(data, {
      completionStrategy: 'all_up_to_current_month_done'
    });

    const recurring = parsed.filter(t => t.recurrence && t.recurrence !== 'NONE');
    expect(recurring.length).toBe(49);

    for (const task of recurring) {
      // Must be pending so future occurrences can be checked
      expect(task.status).toBe('PENDING');
      // Has completed dates in past / up to September
      expect(task.completed_dates?.length).toBeGreaterThan(0);
      // None of the completed dates should be in October 2026 or future
      for (const d of task.completed_dates || []) {
        expect(d <= '2026-09-30').toBe(true);
      }
    }

    // Standalone tasks in September or earlier should be DONE, October should be PENDING
    const klarnaOct = parsed.find(t => t.title.toLowerCase().includes('klarna') && t.due_date?.startsWith('2026-10'));
    if (klarnaOct) {
      expect(klarnaOct.status).toBe('PENDING');
    }
  });
});

