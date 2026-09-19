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

export type TaskRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type TaskCategory = string;
export type TaskStatus = 'PENDING' | 'DONE';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

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
  recurrence?: TaskRecurrence;
  recurrenceDay?: number; // e.g. 25 for monthly tasks on the 25th
  completedDates?: string[]; // Array of YYYY-MM-DD when recurring task was completed
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
