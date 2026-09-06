import { Schema, model, type Document, type Types } from 'mongoose';
import type {
  Category,
  Urgency,
  Status,
  ClassificationStatus,
  Message,
  Draft,
} from '@mailmind/shared/types';

export interface ThreadDoc extends Document {
  _id: Types.ObjectId;
  userId: string;
  externalThreadId: string;
  subject: string;
  participants: string[];

  messages: Message[];
  messageCount: number;
  messagesTruncated: boolean;

  category: Category;
  correctedCategory: Category | null;
  urgency: Urgency;
  actionNeeded: boolean;
  deadline: Date | null;

  aiExplanation: string;
  classificationStatus: ClassificationStatus;
  classificationError: string | null;

  isRead: boolean;
  needsFollowUp: boolean;

  status: Status;
  snoozedUntil: Date | null;
  repliedAt: Date | null;
  actionedAt: Date | null;

  draftedReply: Draft | null;

  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<Message>(
  {
    sender: { type: String, required: true },
    senderIsFaculty: { type: Boolean, required: true },
    sentAt: { type: String, required: true },
    body: { type: String, required: true },
  },
  { _id: false, timestamps: false },
);

const DraftSchema = new Schema<Draft>(
  {
    subject: { type: String, required: true },
    body: { type: String, required: true },
    savedAt: { type: String, required: true },
  },
  { _id: false },
);

const ThreadSchema = new Schema<ThreadDoc>(
  {
    userId: { type: String, ref: 'User', required: true, index: true },
    externalThreadId: { type: String, required: true },
    subject: { type: String, required: true },
    participants: [{ type: String }],

    messages: { type: [MessageSchema], default: [] },
    messageCount: { type: Number, default: 0 },
    messagesTruncated: { type: Boolean, default: false },

    category: {
      type: String,
      enum: [
        'Meeting',
        'Class/Schedule',
        'Student Issue',
        'Examination',
        'Re-evaluation',
        'Committee/Admin',
        'Research',
        'Other',
      ],
      required: true,
      index: true,
    },
    correctedCategory: {
      type: String,
      enum: [
        'Meeting',
        'Class/Schedule',
        'Student Issue',
        'Examination',
        'Re-evaluation',
        'Committee/Admin',
        'Research',
        'Other',
      ],
      default: null,
    },

    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: true,
      index: true,
    },
    actionNeeded: { type: Boolean, default: false },
    deadline: { type: Date, default: null },

    aiExplanation: { type: String, required: true },
    classificationStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    classificationError: { type: String, default: null },

    isRead: { type: Boolean, default: false, index: true },
    needsFollowUp: { type: Boolean, default: false, index: true },

    status: {
      type: String,
      enum: ['unread', 'read', 'replied', 'actioned', 'snoozed'],
      default: 'unread',
      index: true,
    },
    snoozedUntil: { type: Date, default: null },
    repliedAt: { type: Date, default: null },
    actionedAt: { type: Date, default: null },

    draftedReply: { type: DraftSchema, default: null },

    lastMessageAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

ThreadSchema.index({ userId: 1, externalThreadId: 1 }, { unique: true });
ThreadSchema.index({ userId: 1, urgency: 1, lastMessageAt: -1 });
ThreadSchema.index({ userId: 1, category: 1, lastMessageAt: -1 });
ThreadSchema.index({ userId: 1, status: 1, urgency: -1 });

export const Thread = model<ThreadDoc>('Thread', ThreadSchema);
