import { Schema, model, type Document, type Types } from 'mongoose';
import type { IngestionProviderKind } from '@mailmind/shared/types';

export interface EmailAccountLinkDoc extends Document {
  _id: Types.ObjectId;
  userId: string;
  provider: IngestionProviderKind;
  gmailAccessTokenEncrypted: string | null;
  gmailRefreshTokenEncrypted: string | null;
  lastSyncedAt: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

const EmailAccountLinkSchema = new Schema<EmailAccountLinkDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
    },
    provider: { type: String, enum: ['mock', 'gmail'], default: 'mock' },
    gmailAccessTokenEncrypted: { type: String, default: null },
    gmailRefreshTokenEncrypted: { type: String, default: null },
    lastSyncedAt: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ['idle', 'syncing', 'error'],
      default: 'idle',
    },
  },
  { timestamps: true },
);

export const EmailAccountLink = model<EmailAccountLinkDoc>(
  'EmailAccountLink',
  EmailAccountLinkSchema,
);
