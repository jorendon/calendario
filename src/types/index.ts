export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  googleConnected?: boolean;
}

export interface Calendar {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdBy: string;
  isDefault: boolean;
  memberEmails: string[];
  createdAt: string;
}

export type TaskCategory = 'rent' | 'bills' | 'chores' | 'personal' | 'work' | 'other';
export type TaskStatus = 'PENDING' | 'DONE';

export interface Task {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  amount?: number;
  currency?: string;
  category: TaskCategory;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: string;
  createdBy: string;
  assignedTo?: string;
  googleTaskId?: string;
  createdAt: string;
}

export interface CalendarSummary {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  dueTodayTasks: number;
  overdueTasks: number;
  totalPendingAmount: number;
}
