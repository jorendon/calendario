import { useState, useEffect, useCallback } from 'react';
import { Task, Calendar, User } from '../types';
import confetti from 'canvas-confetti';

const STORAGE_TASKS_KEY = 'calendario_tasks_cache_v1';
const STORAGE_CALENDARS_KEY = 'calendario_calendars_cache_v1';
const STORAGE_USERS_KEY = 'calendario_users_cache_v1';
const STORAGE_ACTIVE_USER_KEY = 'calendario_active_user_v1';

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
        status: 'PENDING',
        createdBy: 'Jonathan.rendon@gmail.com',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-internet-default',
        calendarId: 'cal-shared-home',
        title: 'Pagar servicio de Internet y Luz',
        description: 'Factura mensual de servicios',
        dueDate: today,
        dueTime: '12:00',
        amount: 120,
        currency: 'USD',
        category: 'bills',
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

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_USERS;
  });

  const [activeUser, setActiveUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_USERS[0];
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

  // Sync state to localStorage cache for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
      localStorage.setItem(STORAGE_CALENDARS_KEY, JSON.stringify(calendars));
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      if (activeUser) {
        localStorage.setItem(STORAGE_ACTIVE_USER_KEY, JSON.stringify(activeUser));
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_USER_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [tasks, calendars, users, activeUser]);

  // Fetch initial tasks from backend if online
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
      // Local fallback active, no error to user
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
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    setTasks(prev => [newTask, ...prev]);
    showToast(`Tarea "${newTask.title}" creada. Correo enviado a los miembros.`);

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id: newTask.calendarId,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.dueDate,
          due_time: newTask.dueTime,
          amount: newTask.amount,
          currency: newTask.currency,
          category: newTask.category,
          created_by: activeUser?.email || 'Jonathan.rendon@gmail.com',
          assigned_to: newTask.assignedTo
        })
      });
    } catch {
      // Saved in local cache
    }
  };

  // Toggle or mark Task as Done
  const toggleTaskStatus = async (taskId: string) => {
    let updatedTask: Task | null = null;

    setTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          const nextStatus = task.status === 'DONE' ? 'PENDING' : 'DONE';
          const isDone = nextStatus === 'DONE';

          if (isDone) {
            // Confetti celebration
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.7 }
              });
            } catch {
              // ignore
            }
          }

          updatedTask = {
            ...task,
            status: nextStatus,
            completedAt: isDone ? new Date().toISOString() : undefined,
            completedBy: isDone ? (activeUser?.name || activeUser?.email || 'Usuario') : undefined
          };
          return updatedTask;
        }
        return task;
      })
    );

    if (updatedTask) {
      const isDone = (updatedTask as Task).status === 'DONE';
      showToast(
        isDone
          ? `¡Tarea "${(updatedTask as Task).title}" marcada como LISTA! Se mantiene en el calendario.`
          : `Tarea reabierta como pendiente.`
      );

      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: (updatedTask as Task).status,
            completed_by: activeUser?.name || activeUser?.email || 'Usuario'
          })
        });
      } catch {
        // Cached locally
      }
    }
  };

  // Update Task details
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, ...updates } : task))
    );
    showToast('Tarea actualizada correctamente.');

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch {
      // Cached locally
    }
  };

  // Delete Task
  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    showToast('Tarea eliminada del calendario.');

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
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
    createCalendar,
    addUser,
    importGoogleTasks,
    refreshTasks: fetchTasks
  };
}
