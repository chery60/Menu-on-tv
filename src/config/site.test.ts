import { describe, expect, it } from 'vitest';
import { typedAddress } from './site';

describe('typedAddress', () => {
  it('drops the scheme so an owner can type it on a TV', () => {
    expect(typedAddress('https://menuontv.netlify.app', '/pair')).toBe('menuontv.netlify.app/pair');
    expect(typedAddress('http://localhost:3000/', '/sign-in')).toBe('localhost:3000/sign-in');
  });
});
