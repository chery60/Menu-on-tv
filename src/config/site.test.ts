import { describe, expect, it } from 'vitest';
import { siteConfig, typedAddress } from './site';

describe('typedAddress', () => {
  it('drops the scheme so an owner can type it on a TV', () => {
    expect(typedAddress('https://menuontv.netlify.app', '/pair')).toBe('menuontv.netlify.app/pair');
    expect(typedAddress('http://localhost:3000/', '/sign-in')).toBe('localhost:3000/sign-in');
  });
});

describe('search snippet', () => {
  it('fits the title and description in a search result without being cut', () => {
    expect(siteConfig.title.length).toBeLessThanOrEqual(60);
    expect(siteConfig.description.length).toBeLessThanOrEqual(160);
  });
});
