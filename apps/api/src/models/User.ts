import { Schema, model, type Document } from 'mongoose';
import { randomUUID } from 'node:crypto';

export interface UserDoc extends Document<string> {
  _id: string; // better-auth user id
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  role: 'faculty' | 'admin';
  vipSenders: string[];
  customVips: string[];
  staleThresholdHrs: number;
  followupThresholdHrs: number;
  digestEnabled: boolean;
  categoryOverrides: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    _id: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    image: { type: String },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['faculty', 'admin'], default: 'faculty' },

    vipSenders: {
      type: [String],
      default: [
        'chair.cse@aust.edu',
        'dean@aust.edu',
        'controller.exams@aust.edu',
        'registrar@aust.edu',
        'head.cse@aust.edu',
      ],
    },
    customVips: { type: [String], default: [] },
    staleThresholdHrs: { type: Number, default: 48 },
    followupThresholdHrs: { type: Number, default: 48 },
    digestEnabled: { type: Boolean, default: true },
    categoryOverrides: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, _id: false },
);

UserSchema.pre('save', function (next) {
  if (!this._id) this._id = randomUUID();
  next();
});

export const User = model<UserDoc>('User', UserSchema);
