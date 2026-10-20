import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Secrets for screens. A screen link carries a 32-byte random token; we store only its SHA-256.
 * A TV waiting to pair holds its own secret; we store only that secret's hash too.
 */

const TOKEN_BYTES = 32;
const CODE_LENGTH = 6;
/** No 0/O, 1/I/L: codes are read off a TV across a room and typed on a phone. */
export const PAIRING_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = new RegExp(`^[${PAIRING_ALPHABET}]{${CODE_LENGTH}}$`);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

/** Constant-time check of a secret against a stored hash. */
export function secretMatches(secret: string, storedHash: string): boolean {
  if (!HASH_PATTERN.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashSecret(secret), 'hex'), Buffer.from(storedHash, 'hex'));
}

export function generatePairingCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => PAIRING_ALPHABET[randomInt(PAIRING_ALPHABET.length)]).join('');
}

export function isPairingCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}
