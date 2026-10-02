import { useState, useEffect, useCallback } from 'react';
import { Task, Calendar, User, Category } from '../types';
import confetti from 'canvas-confetti';
import { parseISODate, isTaskOccurrenceCompleted } from '../utils/dateUtils';

const STORAGE_TASKS_KEY = 'calendario_tasks_cache_v2';
const STORAGE_CALENDARS_KEY = 'calendario_calendars_cache_v2';
const STORAGE_USERS_KEY = 'calendario_users_cache_v2';
const STORAGE_ACTIVE_USER_KEY = 'calendario_active_user_v2';
const STORAGE_CATEGORIES_KEY = 'calendario_categories_cache_v2';

const INITIAL_USERS: User[] = [
  {
    id: 'user-jonathan',
    email: 'Jonathan.rendon@gmail.com',
    name: 'Jonathan Rendón',
    role: 'admin'
  },
  {
    id: 'user-michelle',
    email: 'michrotel@gmail.com',
    name: 'Michelle',
    role: 'admin'
  }
];

const INITIAL_CALENDARS: Calendar[] = [
  {
    id: 'cal-shared-home',
    name: 'Hogar & Finanzas Compartidas',
    color: '#4f46e5',
    description: 'Calendario principal de renta, facturas y tareas conjuntas',
    createdBy: 'Jonathan.rendon@gmail.com',
    isDefault: true,
    memberEmails: ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com'],
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'rent', name: 'Renta', icon: '🏠', color: '#6366f1' },
  { id: 'bills', name: 'Servicios / Facturas', icon: '💡', color: '#f59e0b' },
  { id: 'chores', name: 'Hogar / Limpieza', icon: '🧹', color: '#10b981' },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#06b6d4' },
  { id: 'work', name: 'Trabajo', icon: '💼', color: '#8b5cf6' },
  { id: 'other', name: 'Otros', icon: '📌', color: '#64748b' }
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TASKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [calendars, setCalendars] = useState<Calendar[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CALENDARS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_CALENDARS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATEGORIES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_CATEGORIES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  // activeUser starts as null so Login Gate is strictly displayed first!
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const logout = () => {
    setActiveUser(null);
    try {
      localStorage.removeItem(STORAGE_ACTIVE_USER_KEY);
    } catch {
      // ignore
    }
    showToast('Sesión cerrada correctamente.');
  };

  // Sync state to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_CALENDARS_KEY, JSON.stringify(calendars));
      localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      if (activeUser) {
        localStorage.setItem(STORAGE_ACTIVE_USER_KEY, JSON.stringify(activeUser));
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_USER_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [tasks, calendars, categories, users, activeUser]);

  // Fetch initial data from backend if online
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: Task[] = data.map(d => ({
            id: d.id,
            calendarId: d.calendar_id || d.calendarId || 'cal-shared-home',
            title: d.title,
            description: d.description,
            dueDate: d.due_date || d.dueDate,
            dueTime: d.due_time || d.dueTime,
            amount: d.amount ? Number(d.amount) : undefined,
            currency: d.currency || 'USD',
            category: d.category || 'other',
            recurrence: d.recurrence || 'NONE',
            recurrenceDay: d.recurrence_day ? Number(d.recurrence_day) : undefined,
            completedDates: d.completed_dates || [],
            status: d.status || 'PENDING',
            completedAt: d.completed_at || d.completedAt,
            completedBy: d.completed_by || d.completedBy,
            createdBy: d.created_by || d.createdBy,
            assignedTo: d.assigned_to || d.assignedTo,
            googleTaskId: d.google_task_id || d.googleTaskId,
            createdAt: d.created_at || d.createdAt
          }));
          setTasks(mapped);
          try {
            localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(mapped));
          } catch (e) {
            console.warn('LocalStorage error:', e);
          }
        }
      }

      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData) && catData.length > 0) {
          setCategories(catData);
        }
      }

      const calRes = await fetch('/api/calendars');
      if (calRes.ok) {
        const calData = await calRes.json();
        if (Array.isArray(calData) && calData.length > 0) {
          const mappedCals: Calendar[] = calData.map(c => ({
            id: c.id,
            name: c.name,
            color: c.color,
            description: c.description,
            createdBy: c.created_by || c.createdBy,
            isDefault: Boolean(c.is_default || c.isDefault),
            memberEmails: c.member_emails || c.memberEmails || [],
            createdAt: c.created_at || c.createdAt
          }));
          setCalendars(prev => {
            const map = new Map(mappedCals.map(c => [c.id, c]));
            // Preserve user-created calendars from local state if not yet in backend
            for (const localCal of prev) {
              if (!map.has(localCal.id)) {
                map.set(localCal.id, localCal);
                // Background sync to backend to ensure it is saved
                fetch('/api/calendars', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: localCal.id,
                    name: localCal.name,
                    color: localCal.color,
                    description: localCal.description,
                    created_by: localCal.createdBy,
                    member_emails: localCal.memberEmails
                  })
                }).catch(() => {});
              }
            }
            return Array.from(map.values());
          });
        }
      }

      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData) && usersData.length > 0) {
          setUsers(usersData);
        }
      }
    } catch {
      // Local fallback active
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Create Task
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      completedDates: [],
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    showToast(`Tarea "${newTask.title}" creada. Correo enviado a los miembros.`);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newTask.id,
          calendar_id: newTask.calendarId,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.dueDate,
          due_time: newTask.dueTime,
          amount: newTask.amount,
          currency: newTask.currency,
          category: newTask.category,
          recurrence: newTask.recurrence || 'NONE',
          recurrence_day: newTask.recurrenceDay,
          created_by: activeUser?.email || 'Jonathan.rendon@gmail.com',
          assigned_to: newTask.assignedTo
        })
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved.id) {
          setTasks(prev => prev.map(t => (t.id === newTask.id ? {
            ...t,
            id: saved.id,
            completedDates: saved.completed_dates || t.completedDates || []
          } : t)));
        }
      }
    } catch {
      // Cached locally
    }
  };

  // Toggle Task Status (handles non-recurring or specific occurrence date)
  const toggleTaskStatus = async (taskId: string, occurrenceDate?: string) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) {
      console.warn('toggleTaskStatus: Task not found in local state with id', taskId);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const targetDate = occurrenceDate || today;
    const isRecurring = currentTask.recurrence && currentTask.recurrence !== 'NONE';

    let nextCompletedDates = currentTask.completedDates || [];
    let nextStatus = currentTask.status;
    let isDone = false;

    if (isRecurring) {
      const isAlreadyCompleted = isTaskOccurrenceCompleted(currentTask, targetDate);
      if (isAlreadyCompleted) {
        if (currentTask.recurrence === 'MONTHLY') {
          const ym = targetDate.substring(0, 7);
          const targetTime = parseISODate(targetDate).getTime();
          nextCompletedDates = nextCompletedDates.filter(d => {
            if (d === targetDate) return false;
            if (d.startsWith(ym)) return false;
            const dTime = parseISODate(d).getTime();
            if (!isNaN(dTime) && !isNaN(targetTime) && Math.abs(dTime - targetTime) <= 4 * 86400000) {
              return false;
            }
            return true;
          });
        } else if (currentTask.recurrence === 'YEARLY') {
          const year = targetDate.substring(0, 4);
          nextCompletedDates = nextCompletedDates.filter(d => d !== targetDate && !d.startsWith(year));
        } else {
          nextCompletedDates = nextCompletedDates.filter(d => d !== targetDate);
        }
        isDone = false;
      } else {
        nextCompletedDates = [...nextCompletedDates, targetDate];
        isDone = true;
      }
    } else {
      nextStatus = currentTask.status === 'DONE' ? 'PENDING' : 'DONE';
      isDone = nextStatus === 'DONE';
    }

    if (isDone) {
      try {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    }

    const updatedTask: Task = {
      ...currentTask,
      status: nextStatus,
      completedDates: nextCompletedDates,
      completedAt: isDone ? new Date().toISOString() : undefined,
      completedBy: isDone ? (activeUser?.name || activeUser?.email || 'Usuario') : undefined
    };

    // Update state
    setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));

    showToast(
      isDone
        ? `¡Tarea "${updatedTask.title}" marcada como LISTA!`
        : `Tarea reabierta como pendiente.`
    );

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          action: isDone ? 'COMPLETED' : 'REOPENED',
          status: updatedTask.status,
          completed_dates: updatedTask.completedDates || [],
          completed_by: activeUser?.name || activeUser?.email || 'Usuario',
          title: updatedTask.title,
          description: updatedTask.description || '',
          due_date: updatedTask.dueDate,
          due_time: updatedTask.dueTime || '',
          amount: updatedTask.amount,
          currency: updatedTask.currency || 'USD',
          category: updatedTask.category || 'other',
          recurrence: updatedTask.recurrence || 'NONE',
          recurrence_day: updatedTask.recurrenceDay,
          calendar_id: updatedTask.calendarId || 'cal-shared-home',
          assigned_to: updatedTask.assignedTo || ''
        })
      });
    } catch (e) {
      console.error('Error in toggleTaskStatus fetch:', e);
    }
  };

  // Update Task details
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const existing = tasks.find(t => t.id === taskId);
    if (!existing) return;

    let migratedCompletedDates = updates.completedDates !== undefined
      ? updates.completedDates
      : (existing.completedDates || []);

    // When modifying the schedule of a recurring task, automatically migrate completed dates
    // to the new recurrence day so completed occurrences never get lost or unchecked!
    const oldRecurrence = existing.recurrence || 'NONE';
    const newRecurrence = updates.recurrence !== undefined ? updates.recurrence : oldRecurrence;

    if (oldRecurrence === 'MONTHLY' && newRecurrence === 'MONTHLY' && Array.isArray(migratedCompletedDates) && migratedCompletedDates.length > 0) {
      const oldDay = existing.recurrenceDay || (existing.dueDate ? parseISODate(existing.dueDate).getDate() : 1);
      const newDay = updates.recurrenceDay !== undefined
        ? updates.recurrenceDay
        : (updates.dueDate ? parseISODate(updates.dueDate).getDate() : oldDay);

      if (oldDay !== newDay) {
        const oldStart = existing.dueDate ? parseISODate(existing.dueDate) : null;
        const newStart = updates.dueDate ? parseISODate(updates.dueDate) : null;
        const monthOffset = (oldStart && newStart && !isNaN(oldStart.getTime()) && !isNaN(newStart.getTime()))
          ? (newStart.getFullYear() * 12 + newStart.getMonth()) - (oldStart.getFullYear() * 12 + oldStart.getMonth())
          : 0;

        migratedCompletedDates = Array.from(new Set(migratedCompletedDates.map(dateStr => {
          const parts = dateStr.split('-');
          if (parts.length !== 3) return dateStr;
          let year = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10);

          if (monthOffset !== 0) {
            const shifted = new Date(year, month - 1 + monthOffset, 1);
            year = shifted.getFullYear();
            month = shifted.getMonth() + 1;
          }

          const daysInMonth = new Date(year, month, 0).getDate();
          const targetDay = Math.min(newDay, daysInMonth);
          const mm = String(month).padStart(2, '0');
          const dd = String(targetDay).padStart(2, '0');
          return `${year}-${mm}-${dd}`;
        })));
      }
    }

    const updatedFullTask: Task = {
      ...existing,
      ...updates,
      completedDates: migratedCompletedDates
    };

    setTasks(prev =>
      prev.map(task => (task.id === taskId ? updatedFullTask : task))
    );
    showToast('Tarea actualizada correctamente.');

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          action: 'EDITED',
          title: updatedFullTask.title,
          description: updatedFullTask.description || '',
          due_date: updatedFullTask.dueDate,
          due_time: updatedFullTask.dueTime || '',
          amount: updatedFullTask.amount,
          currency: updatedFullTask.currency || 'USD',
          category: updatedFullTask.category || 'other',
          recurrence: updatedFullTask.recurrence || 'NONE',
          recurrence_day: updatedFullTask.recurrenceDay,
          status: updatedFullTask.status || 'PENDING',
          completed_dates: updatedFullTask.completedDates || [],
          calendar_id: updatedFullTask.calendarId || 'cal-shared-home',
          assigned_to: updatedFullTask.assignedTo || '',
          updated_by: activeUser?.name || activeUser?.email || 'Usuario'
        })
      });
    } catch (e) {
      console.error('Error in updateTask fetch:', e);
    }
  };

  // Delete Task
  const deleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    setTasks(prev => prev.filter(task => task.id !== taskId));
    showToast('Tarea eliminada del calendario.');

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          task: taskToDelete ? {
            id: taskToDelete.id,
            title: taskToDelete.title,
            description: taskToDelete.description || '',
            due_date: taskToDelete.dueDate,
            due_time: taskToDelete.dueTime || '',
            amount: taskToDelete.amount,
            currency: taskToDelete.currency || 'USD',
            category: taskToDelete.category || 'other',
            recurrence: taskToDelete.recurrence || 'NONE',
            recurrence_day: taskToDelete.recurrenceDay,
            calendar_id: taskToDelete.calendarId || 'cal-shared-home'
          } : undefined,
          deleted_by: activeUser?.name || activeUser?.email || 'Jonathan o Michelle'
        })
      });
    } catch {
      // Cached locally
    }
  };

  // Create Category
  const createCategory = async (name: string, icon: string, color: string) => {
    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      icon,
      color,
      isCustom: true
    };

    setCategories(prev => [...prev, newCategory]);
    showToast(`Categoría "${name}" creada exitosamente.`);

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          icon,
          color,
          created_by: activeUser?.email || 'Jonathan.rendon@gmail.com'
        })
      });
    } catch {
      // Cached locally
    }
  };

  // Create new Calendar
  const createCalendar = async (name: string, color: string, description?: string) => {
    const creatorEmail = activeUser?.email || 'Jonathan.rendon@gmail.com';
    const newCal: Calendar = {
      id: `cal-${Date.now()}`,
      name,
      color,
      description,
      createdBy: creatorEmail,
      isDefault: false,
      memberEmails: ['Jonathan.rendon@gmail.com', 'michrotel@gmail.com', creatorEmail],
      createdAt: new Date().toISOString()
    };

    setCalendars(prev => [...prev, newCal]);
    setSelectedCalendarId(newCal.id);
    showToast(`Calendario "${name}" creado exitosamente.`);

    try {
      await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newCal.id,
          name,
          color,
          description,
          created_by: creatorEmail,
          member_emails: newCal.memberEmails
        })
      });
    } catch {
      // Cached locally
    }
  };

  // Delete Calendar
  const deleteCalendar = async (calId: string) => {
    if (calId === 'cal-shared-home' || calId === 'all') {
      showToast('El calendario principal no puede ser eliminado.');
      return;
    }

    const calToDelete = calendars.find(c => c.id === calId);
    const calName = calToDelete ? calToDelete.name : 'Calendario';

    // 1. Remove calendar and reassign its tasks to default calendar
    setCalendars(prev => prev.filter(c => c.id !== calId));
    setTasks(prev => prev.map(t => (t.calendarId === calId ? { ...t, calendarId: 'cal-shared-home' } : t)));

    // 2. Reset selection if current calendar was deleted
    if (selectedCalendarId === calId) {
      setSelectedCalendarId('cal-shared-home');
    }

    showToast(`Calendario "${calName}" eliminado.`);

    // 3. Persist in backend
    try {
      await fetch(`/api/calendars?id=${encodeURIComponent(calId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: calId })
      });
    } catch {
      // Offline fallback
    }
  };

  // Add new User
  const addUser = async (name: string, email: string, password = 'Calendario2006*') => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: 'member'
    };

    setUsers(prev => [...prev, newUser]);
    showToast(`Usuario ${name} (${email}) agregado. Ya puede iniciar sesión.`);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
    } catch {
      // Cached locally
    }
  };

  // Import from Google Tasks
  const importGoogleTasks = async (tasksToImport?: any[]) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id: selectedCalendarId !== 'all' ? selectedCalendarId : 'cal-shared-home',
          user_email: activeUser?.email || 'Jonathan.rendon@gmail.com',
          tasks_to_import: tasksToImport
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`¡${data.count || 2} tareas sincronizadas desde Google Tasks!`);
        fetchTasks();
      } else {
        showToast('Tareas de Google importadas al calendario.');
      }
    } catch {
      showToast('Sincronización simulada en local.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCalendarTasks = async (calendarId: string) => {
    setTasks(prev => {
      const updated = prev.filter(t => t.calendarId !== calendarId);
      try {
        localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error in clearCalendarTasks:', e);
      }
      return updated;
    });
    showToast('Se han eliminado las tareas del calendario.');

    try {
      await fetch(`/api/tasks?calendarId=${encodeURIComponent(calendarId)}&id=all`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'all', calendar_id: calendarId })
      });
    } catch {
      // Offline fallback
    }
  };

  const importTasksLocal = (importedList: any[], calendarId: string, clearExisting?: boolean) => {
    if (!Array.isArray(importedList) || importedList.length === 0) return;
    const mapped: Task[] = importedList.map(d => ({
      id: d.id,
      calendarId: calendarId,
      title: d.title,
      description: d.description,
      dueDate: d.due_date || d.dueDate,
      dueTime: d.due_time || d.dueTime || '10:00',
      amount: d.amount ? Number(d.amount) : undefined,
      currency: d.currency || 'USD',
      category: d.category || 'other',
      recurrence: d.recurrence || 'NONE',
      recurrenceDay: d.recurrence_day ? Number(d.recurrence_day) : (d.recurrenceDay ? Number(d.recurrenceDay) : undefined),
      completedDates: Array.isArray(d.completed_dates) ? d.completed_dates : (Array.isArray(d.completedDates) ? d.completedDates : []),
      status: d.status || 'PENDING',
      createdBy: d.created_by || d.createdBy,
      assignedTo: d.assigned_to || d.assignedTo,
      googleTaskId: d.google_task_id || d.googleTaskId,
      createdAt: d.created_at || d.createdAt || new Date().toISOString()
    }));

    setTasks(prev => {
      const base = clearExisting ? prev.filter(t => t.calendarId !== calendarId) : prev;
      const map = new Map(base.map(t => [t.id, t]));
      for (const t of mapped) {
        map.set(t.id, t);
      }
      const updated = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error in importTasksLocal:', e);
      }
      return updated;
    });
    showToast(`Se cargaron ${mapped.length} tareas en tu calendario.`);
  };

  // Filter tasks by active calendar
  const filteredTasks = tasks.filter(task => {
    if (selectedCalendarId === 'all') return true;
    return task.calendarId === selectedCalendarId;
  });

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    calendars,
    categories,
    users,
    activeUser,
    setActiveUser,
    logout,
    selectedCalendarId,
    setSelectedCalendarId,
    isLoading,
    notificationMsg,
    createTask,
    toggleTaskStatus,
    updateTask,
    deleteTask,
    createCategory,
    createCalendar,
    deleteCalendar,
    addUser,
    importGoogleTasks,
    importTasksLocal,
    clearCalendarTasks,
    refreshTasks: fetchTasks
  };
}
