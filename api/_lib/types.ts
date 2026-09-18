export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar_url?: string;
  role: string;
  google_refresh_token?: string;
  created_at: string;
}

export interface DBCalendar {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_by: string;
  is_default: boolean;
  member_emails: string[];
  created_at: string;
}

export interface DBTask {
  id: string;
  calendar_id: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  amount?: number;
  currency?: string;
  category: string;
  status: 'PENDING' | 'DONE';
  completed_at?: string;
  completed_by?: string;
  created_by: string;
  assigned_to?: string;
  google_task_id?: string;
  created_at: string;
}
