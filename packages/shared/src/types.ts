export type Category =
  | 'Meeting'
  | 'Class/Schedule'
  | 'Student Issue'
  | 'Examination'
  | 'Re-evaluation'
  | 'Committee/Admin'
  | 'Research'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Meeting',
  'Class/Schedule',
  'Student Issue',
  'Examination',
  'Re-evaluation',
  'Committee/Admin',
  'Research',
  'Other',
];

export type Urgency = 'Low' | 'Medium' | 'High' | 'Critical';

export const URGENCIES: Urgency[] = ['Low', 'Medium', 'High', 'Critical'];

export type Status = 'unread' | 'read' | 'replied' | 'actioned' | 'snoozed';

export const STATUSES: Status[] = [
  'unread',
  'read',
  'replied',
  'actioned',
  'snoozed',
];

export type ClassificationStatus = 'pending' | 'completed' | 'failed';

export type IngestionProviderKind = 'mock' | 'gmail';

export interface Participant {
  name?: string;
  address: string;
}

export interface Message {
  sender: string;
  senderIsFaculty: boolean;
  sentAt: string;
  body: string;
}

export interface Draft {
  subject: string;
  body: string;
  savedAt: string;
}

export interface Thread {
  id: string;
  userId: string;
  externalThreadId: string;
  subject: string;
  participants: string[];

  messages: Message[];
  messageCount: number;
  messagesTruncated?: boolean;

  category: Category;
  correctedCategory: Category | null;
  effectiveCategory: Category;

  urgency: Urgency;
  actionNeeded: boolean;
  deadline: string | null;

  aiExplanation: string;
  classificationStatus: ClassificationStatus;
  classificationError: string | null;

  isRead: boolean;
  needsFollowUp: boolean;

  status: Status;
  snoozedUntil: string | null;
  repliedAt: string | null;
  actionedAt: string | null;

  draftedReply: Draft | null;

  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadSummary {
  id: string;
  subject: string;
  category: Category;
  effectiveCategory: Category;
  urgency: Urgency;
  aiExplanation: string;
  deadline: string | null;
  isRead: boolean;
  needsFollowUp: boolean;
  status: Status;
  lastMessageAt: string;
  messageCount: number;
  participants: string[];
}

export interface DashboardStats {
  total: number;
  unread: number;
  urgent: number;
  stale: number;
  byCategory: Record<string, number>;
  byUrgency: Record<string, number>;
  todaysAttention: ThreadSummary[];
}

export interface UserSettings {
  vipSenders: string[];
  customVips: string[];
  staleThresholdHrs: number;
  followupThresholdHrs: number;
  digestEnabled: boolean;
  categoryOverrides: Record<string, string>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'faculty' | 'admin';
  settings: UserSettings;
}
