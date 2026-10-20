import { describe, expect, it } from 'vitest';
import { checkBasicAuth, constantTimeEqual } from './basic-auth';

const header = (credentials: string): string => `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;

describe('constantTimeEqual', () => {
  it('returns true only for identical strings', () => {
    expect(constantTimeEqual('chalk', 'chalk')).toBe(true);
    expect(constantTimeEqual('chalk', 'chalks')).toBe(false);
    expect(constantTimeEqual('chalk', 'chalc')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('checkBasicAuth', () => {
  it('accepts the right password with any username', () => {
    expect(checkBasicAuth(header('anyone:s3cret'), 's3cret')).toBe(true);
    expect(checkBasicAuth(header(':s3cret'), 's3cret')).toBe(true);
  });

  it('keeps colons inside the password', () => {
    expect(checkBasicAuth(header('me:pa:ss'), 'pa:ss')).toBe(true);
  });

  it('supports non-ASCII passwords', () => {
    expect(checkBasicAuth(header('me:pässwört'), 'pässwört')).toBe(true);
  });

  it('rejects wrong, missing or malformed credentials', () => {
    expect(checkBasicAuth(header('me:nope'), 's3cret')).toBe(false);
    expect(checkBasicAuth(null, 's3cret')).toBe(false);
    expect(checkBasicAuth('Bearer token', 's3cret')).toBe(false);
    expect(checkBasicAuth('Basic %%%not-base64', 's3cret')).toBe(false);
    expect(checkBasicAuth(header('no-separator'), 's3cret')).toBe(false);
  });

  it('never accepts when no password is configured', () => {
    expect(checkBasicAuth(header('me:'), '')).toBe(false);
  });
});
