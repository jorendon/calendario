export interface NormalizedImportTask {
  id?: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  amount?: number;
  currency?: string;
  category: string;
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrence_day?: number;
  completed_dates?: string[];
  status: 'PENDING' | 'DONE';
  created_by?: string;
  google_task_id?: string;
}

export function extractAmount(text?: string): number | undefined {
  if (!text) return undefined;

  // 1. Match explicit dollar sign: $1,234.56, $1200.00, $36,05, $419, $22.9, $5.00
  const dollarMatch = text.match(/\$\s*([0-9]+(?:[.,][0-9]{1,2})?)/);
  if (dollarMatch) {
    const clean = dollarMatch[1].replace(',', '.');
    const val = parseFloat(clean);
    if (!isNaN(val)) return val;
  }

  // 2. Match pattern like 'Klarna 56.07' or '56.07'
  const decimalMatch = text.match(/(?:^|\s)([0-9]+(?:\.[0-9]{2}))(?:$|\s)/);
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1]);
    if (!isNaN(val)) return val;
  }

  return undefined;
}

export function inferCategory(title: string, notes?: string): string {
  const combined = `${title} ${notes || ''}`.toLowerCase();

  if (/mortgage|renta|alquiler|arriendo|casa/i.test(combined)) {
    return 'rent';
  }
  if (/internet|at&t|luz|duke|ouc|agua|factura|seguro|insurance|all state|vida|banco|bank of america|wells fargo|capital one|discover|tdc|crédito|tarjeta|descuento|best buy|rooms to go|home depot|mattres|enel/i.test(combined)) {
    return 'bills';
  }
  if (/jardinero|limpieza|nevera|cafetera|despensa|mercado|hogar|bolso/i.test(combined)) {
    return 'chores';
  }
  if (/spotify|netflix|disney|prime|universal|pass|pase/i.test(combined)) {
    return 'personal';
  }
  if (/preply|martial arts|rif|asilo|examen|fitness/i.test(combined)) {
    return 'personal';
  }

  return 'bills';
}

function computeNextOccurrenceDate(dayOfMonth: number, startYear = 2026, startMonth = 9): string {
  const d = new Date(startYear, startMonth - 1, dayOfMonth);
  // Pad with zeroes
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ParseGoogleTasksOptions {
  calendarId?: string;
  defaultUser?: string;
  completionStrategy?: 'all_up_to_current_month_done' | 'original' | 'all_pending' | 'all_done';
  currentReferenceDate?: Date;
}

export function parseGoogleTasksJson(
  input: any,
  options: ParseGoogleTasksOptions = {}
): NormalizedImportTask[] {
  const {
    calendarId = 'cal-shared-home',
    defaultUser = 'Jonathan.rendon@gmail.com',
    completionStrategy = 'all_up_to_current_month_done',
    currentReferenceDate
  } = options;

  const now = currentReferenceDate || new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed, so 8 for September
  const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const endOfCurrentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfCurrentMonth).padStart(2, '0')}`;

  let parsed = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      return [];
    }
  }

  if (!parsed) return [];

  // Check if it's Google Tasks Takeout structure
  // It could have:
  // 1. root.kind === 'tasks#taskLists' with root.items[0].recurrences
  // 2. root.kind === 'tasks#tasks' with root.recurrences
  // 3. root with recurrences and items directly
  let googleLists: any[] = [];
  if (parsed.kind === 'tasks#taskLists' && Array.isArray(parsed.items)) {
    googleLists = parsed.items;
  } else if (parsed.recurrences || (parsed.items && Array.isArray(parsed.items) && parsed.items[0]?.recurrences)) {
    googleLists = Array.isArray(parsed.items) && parsed.items[0]?.recurrences ? parsed.items : [parsed];
  } else if (parsed.kind === 'tasks#tasks') {
    googleLists = [parsed];
  }

  const isGoogleTasksExport = googleLists.some(l => l && (Array.isArray(l.recurrences) || (Array.isArray(l.items) && l.items[0]?.task_recurrence_id)));

  if (isGoogleTasksExport) {
    const results: NormalizedImportTask[] = [];

    for (const list of googleLists) {
      if (!list) continue;
      const rawRecurrences: any[] = Array.isArray(list.recurrences) ? list.recurrences : [];
      const rawItems: any[] = Array.isArray(list.items) ? list.items : [];

      const processedRecurrenceIds = new Set<string>();

      // 1. Process each recurrence in recurrences
      for (const rec of rawRecurrences) {
        if (!rec || !rec.title) continue;
        const recId = rec.id;
        processedRecurrenceIds.add(recId);

        // Find all child instances in items
        const instances = rawItems.filter(it => it && it.task_recurrence_id === recId);

        // Extract notes from the latest instance that has notes
        let notes = '';
        for (const inst of instances) {
          if (inst.notes && inst.notes.trim()) {
            notes = inst.notes.trim();
            break;
          }
        }

        // Extract amount from notes or title
        let amount = extractAmount(notes) ?? extractAmount(rec.title);

        // Determine recurrence rule
        const sched = rec.schedule || {};
        const interval = sched.interval || {};
        let recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY';
        let recurrenceDay: number | undefined = undefined;

        if (interval.monthly) {
          recurrence = 'MONTHLY';
          recurrenceDay = interval.monthly.day_of_month || 1;
        } else if (interval.weekly) {
          recurrence = 'WEEKLY';
        } else if (interval.yearly) {
          recurrence = 'YEARLY';
        }

        // Collect completed dates from past instances
        const completedDatesSet = new Set<string>();
        let hasActiveInstance = false;
        let latestScheduledDate: string | undefined = undefined;

        for (const inst of instances) {
          const instDate = inst.scheduled_time?.[0]?.start?.split('T')[0] ||
                           inst.due?.split('T')[0] ||
                           inst.completed?.split('T')[0];

          if (inst.status === 'completed' && instDate) {
            completedDatesSet.add(instDate);
          } else if (inst.status === 'needsAction') {
            hasActiveInstance = true;
            if (instDate && (!latestScheduledDate || instDate > latestScheduledDate)) {
              latestScheduledDate = instDate;
            }
          }
        }

        // Determine dueDate for this recurring task
        // We use first_instance_date so that the recurrence rule is active across current and past months
        let dueDate: string;
        if (sched.first_instance_date) {
          dueDate = sched.first_instance_date.split('T')[0];
        } else if (recurrenceDay) {
          dueDate = computeNextOccurrenceDate(recurrenceDay, 2025, 1);
        } else if (latestScheduledDate) {
          dueDate = latestScheduledDate;
        } else {
          dueDate = '2025-01-01';
        }

        let taskStatus: 'PENDING' | 'DONE' = hasActiveInstance ? 'PENDING' : 'DONE';

        if (completionStrategy === 'all_up_to_current_month_done') {
          const startY = sched.first_instance_date ? parseInt(sched.first_instance_date.substring(0, 4), 10) : 2025;
          const startM = sched.first_instance_date ? parseInt(sched.first_instance_date.substring(5, 7), 10) - 1 : 0;

          if (recurrence === 'MONTHLY' && recurrenceDay) {
            for (let y = startY; y <= currentYear; y++) {
              const minM = y === startY ? Math.max(0, startM) : 0;
              const maxM = y === currentYear ? currentMonth : 11;
              for (let m = minM; m <= maxM; m++) {
                const daysInM = new Date(y, m + 1, 0).getDate();
                const d = Math.min(recurrenceDay, daysInM);
                const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                completedDatesSet.add(dateStr);
              }
            }
          } else if (recurrence === 'WEEKLY') {
            const [yStr, mStr, dStr] = dueDate.split('-').map(Number);
            const targetWeekday = new Date(yStr, mStr - 1, dStr).getDay();
            const cur = new Date(startY, startM, 1);
            const endLimit = new Date(currentYear, currentMonth + 1, 0);
            while (cur <= endLimit) {
              if (cur.getDay() === targetWeekday) {
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, '0');
                const d = String(cur.getDate()).padStart(2, '0');
                completedDatesSet.add(`${y}-${m}-${d}`);
              }
              cur.setDate(cur.getDate() + 1);
            }
          }
          // Remove any completed dates after end of current month
          for (const d of Array.from(completedDatesSet)) {
            if (d > endOfCurrentMonthStr) {
              completedDatesSet.delete(d);
            }
          }
          taskStatus = 'PENDING';
        } else if (completionStrategy === 'all_pending') {
          completedDatesSet.clear();
          taskStatus = 'PENDING';
        } else if (completionStrategy === 'all_done') {
          taskStatus = 'DONE';
        }

        results.push({
          id: `gtask-rec-${recId}`,
          title: rec.title.trim(),
          description: notes,
          due_date: dueDate,
          due_time: '10:00',
          amount,
          currency: 'USD',
          category: inferCategory(rec.title, notes),
          recurrence,
          recurrence_day: recurrenceDay,
          completed_dates: Array.from(completedDatesSet).sort(),
          status: taskStatus,
          created_by: defaultUser,
          google_task_id: recId
        });
      }

      // 2. Process standalone items (items with NO recurrence or whose recurrence was not in recurrences list)
      for (const item of rawItems) {
        if (!item || !item.title || !item.title.trim()) continue;
        if (item.task_recurrence_id && processedRecurrenceIds.has(item.task_recurrence_id)) {
          // Already merged into recurrence!
          continue;
        }

        const title = item.title.trim();
        const notes = item.notes?.trim() || '';
        const amount = extractAmount(notes) ?? extractAmount(title);
        const rawDate = item.scheduled_time?.[0]?.start?.split('T')[0] ||
                        item.due?.split('T')[0] ||
                        item.created?.split('T')[0] ||
                        new Date().toISOString().split('T')[0];

        const isCompleted = item.status === 'completed' || Boolean(item.completed);
        let standaloneStatus: 'PENDING' | 'DONE' = isCompleted ? 'DONE' : 'PENDING';
        let standaloneCompletedDates: string[] = isCompleted ? [rawDate] : [];

        if (completionStrategy === 'all_up_to_current_month_done') {
          if (rawDate <= endOfCurrentMonthStr) {
            standaloneStatus = 'DONE';
            standaloneCompletedDates = [rawDate];
          } else {
            standaloneStatus = 'PENDING';
            standaloneCompletedDates = [];
          }
        } else if (completionStrategy === 'all_pending') {
          standaloneStatus = 'PENDING';
          standaloneCompletedDates = [];
        } else if (completionStrategy === 'all_done') {
          standaloneStatus = 'DONE';
          standaloneCompletedDates = [rawDate];
        }

        results.push({
          id: `gtask-item-${item.id}`,
          title,
          description: notes,
          due_date: rawDate,
          due_time: '10:00',
          amount,
          currency: 'USD',
          category: inferCategory(title, notes),
          recurrence: 'NONE',
          completed_dates: standaloneCompletedDates,
          status: standaloneStatus,
          created_by: defaultUser,
          google_task_id: item.id
        });
      }
    }

    return results;
  }

  // Fallback: standard or custom JSON format (array of task objects)
  let rawList: any[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.tasks)) rawList = parsed.tasks;
    else if (Array.isArray(parsed.items)) rawList = parsed.items;
    else if (Array.isArray(parsed.data)) rawList = parsed.data;
    else rawList = [parsed];
  }

  const standardResults: NormalizedImportTask[] = [];

  for (const item of rawList) {
    if (!item) continue;
    const title = (item.title || item.titulo || item.name || item.nombre || item.task || '').trim();
    if (!title) continue;

    let rawDate = item.due_date || item.dueDate || item.due || item.fecha || item.date || item.fecha_vencimiento;
    let dueDate = new Date().toISOString().split('T')[0];
    if (rawDate) {
      dueDate = String(rawDate).split('T')[0];
    }

    const dueTime = item.due_time || item.dueTime || item.hora || '10:00';
    const notes = item.description || item.descripcion || item.notes || item.notas || '';

    let amount: number | undefined = undefined;
    const rawAmount = item.amount ?? item.monto ?? item.valor ?? item.precio;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const parsedAmt = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsedAmt)) amount = parsedAmt;
    }
    if (amount === undefined) {
      amount = extractAmount(notes) ?? extractAmount(title);
    }

    const category = (item.category || item.categoria || inferCategory(title, notes)).toLowerCase();

    const rawRecurrence = String(item.recurrence || item.recurrencia || item.repeticion || 'NONE').toUpperCase();
    let recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'NONE';
    if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(rawRecurrence)) {
      recurrence = rawRecurrence as any;
    } else if (rawRecurrence.includes('MENS') || rawRecurrence === 'MONTH') {
      recurrence = 'MONTHLY';
    } else if (rawRecurrence.includes('SEMAN') || rawRecurrence === 'WEEK') {
      recurrence = 'WEEKLY';
    } else if (rawRecurrence.includes('ANUAL') || rawRecurrence === 'YEAR') {
      recurrence = 'YEARLY';
    }

    let recurrenceDay: number | undefined = undefined;
    if (recurrence === 'MONTHLY') {
      recurrenceDay = Number(item.recurrence_day || item.recurrenceDay || item.dia_repeticion) || (dueDate ? Number(dueDate.split('-')[2]) : 1);
    }

    const rawStatus = String(item.status || item.estado || '').toLowerCase();
    const isDone = rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'lista' || rawStatus === 'completada' || item.completed === true;

    standardResults.push({
      id: item.id || `json-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      description: notes,
      due_date: dueDate,
      due_time: dueTime,
      amount,
      currency: item.currency || 'USD',
      category,
      recurrence,
      recurrence_day: recurrenceDay,
      completed_dates: Array.isArray(item.completed_dates || item.completedDates) ? (item.completed_dates || item.completedDates) : [],
      status: isDone ? 'DONE' : 'PENDING',
      created_by: item.created_by || item.createdBy || defaultUser,
      google_task_id: item.google_task_id || item.googleTaskId
    });
  }

  return standardResults;
}
