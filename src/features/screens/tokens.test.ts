import { describe, expect, it } from 'vitest';
import { generatePairingCode, generateToken, hashSecret, isPairingCode, PAIRING_ALPHABET, secretMatches } from './tokens';

describe('screen tokens', () => {
  it('are long, URL-safe and different every time', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('are stored only as a hash that matches the original and nothing else', () => {
    const token = generateToken();
    const hash = hashSecret(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(secretMatches(token, hash)).toBe(true);
    expect(secretMatches(generateToken(), hash)).toBe(false);
    expect(secretMatches(token, 'not-a-hash')).toBe(false);
  });
});

describe('pairing codes', () => {
  it('use six characters with no look-alikes (0, O, 1, I, L)', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generatePairingCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[01OIL]/);
      expect(isPairingCode(code)).toBe(true);
    }
    expect(PAIRING_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('accept lower case and spaces when an owner types them', () => {
    expect(isPairingCode('ab c d2 3')).toBe(false);
    expect(isPairingCode(' abcd23 '.trim().toUpperCase())).toBe(true);
    expect(isPairingCode('ABCD2O')).toBe(false);
  });
});
