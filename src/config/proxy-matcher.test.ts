import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import { config } from '@/proxy';

describe('proxy matcher', () => {
  it('covers every public page so Accept: text/markdown can be answered', () => {
    for (const page of siteConfig.pages) expect(config.matcher).toContain(page.path);
  });
});
