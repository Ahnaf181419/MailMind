import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { ok } from '@mailmind/shared/envelope';

const SettingsPatch = z.object({
  vipSenders: z.array(z.string()).optional(),
  customVips: z.array(z.string()).optional(),
  staleThresholdHrs: z.number().int().min(1).max(720).optional(),
  followupThresholdHrs: z.number().int().min(1).max(720).optional(),
  digestEnabled: z.boolean().optional(),
  categoryOverrides: z.record(z.string()).optional(),
});

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const u = await User.findById(userId).lean();
    if (!u) {
      res.json(ok({
        vipSenders: [],
        customVips: [],
        staleThresholdHrs: 48,
        followupThresholdHrs: 48,
        digestEnabled: true,
        categoryOverrides: {},
      }));
      return;
    }
    res.json(ok({
      vipSenders: u.vipSenders,
      customVips: u.customVips,
      staleThresholdHrs: u.staleThresholdHrs,
      followupThresholdHrs: u.followupThresholdHrs,
      digestEnabled: u.digestEnabled,
      categoryOverrides: u.categoryOverrides,
    }));
  } catch (err) {
    next(err);
  }
}

export async function patchSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SettingsPatch.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Invalid settings payload',
          details: parsed.error.flatten().fieldErrors,
        },
      });
      return;
    }
    const userId = req.user!.id;
    const updated = await User.findByIdAndUpdate(userId, parsed.data, {
      new: true,
    }).lean();
    res.json(ok({
      vipSenders: updated?.vipSenders ?? [],
      customVips: updated?.customVips ?? [],
      staleThresholdHrs: updated?.staleThresholdHrs ?? 48,
      followupThresholdHrs: updated?.followupThresholdHrs ?? 48,
      digestEnabled: updated?.digestEnabled ?? true,
      categoryOverrides: updated?.categoryOverrides ?? {},
    }));
  } catch (err) {
    next(err);
  }
}
