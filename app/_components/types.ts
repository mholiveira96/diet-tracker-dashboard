export type TabKey = 'chat' | 'analytics' | 'profile';

export type ChatAttachment = {
  id: number;
  url: string;
  original_name?: string;
  mime_type?: string;
};

export type ChatMessage = {
  id: number | string;
  role: 'user' | 'assistant';
  message_type: string;
  text: string;
  status: string;
  confidence?: number | null;
  metadata?: any;
  attachments?: ChatAttachment[];
  linked_records?: Array<{ record_type: string; record_id: string; link_type: string }>;
  created_at: string;
};

export type AnalyticsTimelineItem = {
  id: string | number;
  type: 'meal' | 'workout';
  description: string;
  amount: number;
  unit?: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  workout_type?: string | null;
  intensity?: string | null;
  notes?: string | null;
  logged_at: string;
};

export type AnalyticsData = {
  summary: { kcal: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein: number; carbs: number; fat: number };
  workouts: { total: number; duration: number; count: number };
  history: Array<{ day: string; kcal: number; protein: number; workouts_kcal: number; net_kcal: number }>;
  items: Array<AnalyticsTimelineItem>;
};

export type GoalsState = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PreferencesState = {
  parserMode: 'conservative' | 'balanced' | 'aggressive';
  imageRetentionDays: number;
};

export type ProfileSummary = {
  id: number;
  slug: string;
  display_name: string;
  status: string;
};

export type GroupOverviewItem = ProfileSummary & {
  goal_calories: number;
  goal_protein: number;
  kcal: number;
  protein: number;
  workout_kcal: number;
};

export type AuditEvent = {
  id: number;
  profile_id: number;
  entity_type: 'meal' | 'workout';
  entity_id: string;
  action: 'update' | 'delete' | 'restore' | string;
  created_at: string;
  reverted_audit_event_id?: number | null;
};
