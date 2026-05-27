import { RefereeModel } from '../models/referee.js';
import { env } from '../config/env.js';
import { hashPin, hashRefereeToken, secureEqualString } from '../utils/hash.js';
import { ForbiddenError, NotFoundError } from './errors.js';

export async function authenticateReferee(token: string, pin?: string) {
  const tokenHash = hashRefereeToken(token, env.REFEREE_TOKEN_SALT);
  const referee = await RefereeModel.findOne({ accessTokenHash: tokenHash, status: 'active' });

  if (!referee) {
    throw new NotFoundError('Referee not found');
  }

  if (referee.pinHash) {
    if (!pin) {
      throw new ForbiddenError('PIN is required');
    }

    const providedPinHash = hashPin(pin, env.PIN_PEPPER);
    if (!secureEqualString(referee.pinHash, providedPinHash)) {
      throw new ForbiddenError('Invalid PIN');
    }
  }

  referee.lastSeenAt = new Date();
  await referee.save();

  return referee;
}
