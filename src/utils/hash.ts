import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashRefereeToken(token: string, salt: string): string {
  return sha256(`${salt}:${token}`);
}

export function hashPin(pin: string, pepper: string): string {
  return sha256(`${pepper}:${pin}`);
}

export function secureEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
