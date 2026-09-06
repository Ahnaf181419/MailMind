import { Schema, model, type Document, type Types } from 'mongoose';

export interface DigestCacheDoc extends Document {
  _id: Types.ObjectId;
  userId: string;
  digestText: string;
  generatedAt: Date;
  basedOnThreadIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DigestCacheSchema = new Schema<DigestCacheDoc>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
    },
    digestText: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    basedOnThreadIds: [{ type: Schema.Types.ObjectId }],
  },
  { timestamps: true },
);

export const DigestCache = model<DigestCacheDoc>(
  'DigestCache',
  DigestCacheSchema,
);
