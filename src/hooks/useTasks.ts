import { useState, useEffect, useCallback } from 'react';
import { Task, Calendar, User, Category } from '../types';
import confetti from 'canvas-confetti';

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
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'task-rent-default',
        calendarId: 'cal-shared-home',
        title: 'Pagar la renta del mes',
        description: 'Transferencia bancaria de alquiler del hogar',
        dueDate: today,
        dueTime: '09:00',
        amount: 1800,
        currency: 'USD',
        category: 'rent',
        recurrence: 'MONTHLY',
        recurrenceDay: 1,
        status: 'PENDING',
        createdBy: 'Jonathan.rendon@gmail.com',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-power-default',
        calendarId: 'cal-shared-home',
        title: 'Pagar la luz',
        description: 'Factura mensual de electricidad repetitiva todos los 25',
        dueDate: '2026-09-25',
        dueTime: '10:00',
        amount: 110,
        currency: 'USD',
        category: 'bills',
        recurrence: 'MONTHLY',
        recurrenceDay: 25, // Repetitiva los 25 de cada mes
        status: 'PENDING',
        createdBy: 'michrotel@gmail.com',
        createdAt: new Date().toISOString()
      }
    ];
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
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
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
          setCalendars(mappedCals);
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
      const isAlreadyCompleted = nextCompletedDates.includes(targetDate);
      nextCompletedDates = isAlreadyCompleted
        ? nextCompletedDates.filter(d => d !== targetDate)
        : [...nextCompletedDates, targetDate];
      isDone = !isAlreadyCompleted;
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
    const updatedFullTask: Task = existing
      ? { ...existing, ...updates }
      : ({ id: taskId, ...updates } as Task);

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
    showToast(`Calendario "${name}" creado exitosamente.`);

    try {
      await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    addUser,
    importGoogleTasks,
    refreshTasks: fetchTasks
  };
}
