import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dataFilePath } from './data-path';

describe('dataFilePath', () => {
  it('uses an explicit override first', () => {
    expect(dataFilePath('tracker.json', '/custom/tracker.json', true)).toBe('/custom/tracker.json');
  });

  it('uses the writable temp directory on a serverless host', () => {
    expect(dataFilePath('waitlist.json', undefined, true)).toBe(join(tmpdir(), 'waitlist.json'));
  });

  it('uses ./data locally', () => {
    expect(dataFilePath('tracker.json', undefined, false)).toBe(join(process.cwd(), 'data', 'tracker.json'));
  });
});
