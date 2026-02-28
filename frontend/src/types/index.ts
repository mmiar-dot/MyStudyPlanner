// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at: string;
  settings: Record<string, any>;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

// Catalog Types
export interface CatalogItem {
  id: string;
  title: string;
  parent_id: string | null;
  order: number;
  description?: string;
  level: number;
  children_count: number;
  created_at: string;
  is_personal?: boolean;
  owner_id?: string;
  is_hidden?: boolean;
}

// Revision Method Types
export type RevisionMethod = 'j_method' | 'srs' | 'tours' | 'none';

export interface JMethodSettings {
  start_date: string;
  intervals: number[];
  recurring_interval: number;
}

export interface SRSSettings {
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review?: string;
}

export interface ToursSettings {
  total_tours: number;
  tour_durations: number[];
  current_tour: number;
}

export interface UserItemSettings {
  id: string;
  user_id: string;
  item_id: string;
  method: RevisionMethod;
  j_settings?: JMethodSettings;
  srs_settings?: SRSSettings;
  tours_settings?: ToursSettings;
  created_at: string;
  updated_at: string;
}

// Session Types
export type SessionStatus = 'pending' | 'completed' | 'skipped' | 'late';

export interface StudySession {
  id: string;
  user_id: string;
  item_id: string;
  item_title: string;
  scheduled_date: string;
  method: RevisionMethod;
  status: SessionStatus;
  j_day?: number;
  tour_number?: number;
  srs_rating?: number;
  scheduled_time?: string;
  completed_at?: string;
  notes?: string;
}

// Event Types
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string;
  count?: number;
  days_of_week?: number[];
}

export interface PersonalEvent {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  recurrence?: RecurrenceRule;
  color: string;
  created_at: string;
}

// ICS Types
export interface ICSSubscription {
  id: string;
  user_id: string;
  name: string;
  url: string;
  color: string;
  last_synced?: string;
  created_at: string;
}

export interface ICSEvent {
  id: string;
  subscription_id: string;
  uid: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  location?: string;
}

// Note Types
export interface ItemNote {
  id: string;
  user_id: string;
  item_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Analytics Types
export interface ProgressStats {
  total_sessions: number;
  completed_sessions: number;
  late_sessions: number;
  active_items: number;
  today_completed: number;
  completion_rate: number;
  streak: number;
}

export interface CalendarDayData {
  pending: number;
  completed: number;
  late: number;
  total: number;
}
