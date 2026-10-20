import { describe, expect, it } from 'vitest';
import { tvVerdict, type TvReport } from './tv-check';

const fullHd: TvReport = { containerQueries: true, liveUpdates: true, offline: true, width: 1920, height: 1080, pixelRatio: 1, fps: 60 };

describe('tvVerdict', () => {
  it('says yes plainly when the TV has everything', () => {
    const verdict = tvVerdict(fullHd);
    expect(verdict.mark).toBe('good');
    expect(verdict.headline).toBe('Yes, this TV can show your menu.');
    expect(verdict.lines.every((line) => line.mark === 'good')).toBe(true);
    expect(verdict.lines.map((line) => line.text)).toContain('Sharp: it draws 1920 by 1080, Full HD.');
  });

  it('turns a TV away when its browser cannot size the menu, and says what to do instead', () => {
    const verdict = tvVerdict({ ...fullHd, containerQueries: false });
    expect(verdict.mark).toBe('bad');
    expect(verdict.headline).toBe('This TV’s browser is too old to show your menu properly.');
    expect(verdict.lines[0]).toEqual({ mark: 'bad', text: expect.stringContaining('streaming stick') });
  });

  it('says yes with things to know when only extras are missing', () => {
    const verdict = tvVerdict({ ...fullHd, liveUpdates: false, offline: false, fps: 12 });
    expect(verdict.mark).toBe('warn');
    expect(verdict.headline).toBe('Yes, this TV can show your menu. Read the notes below.');
    const warnings = verdict.lines.filter((line) => line.mark === 'warn').map((line) => line.text);
    expect(warnings).toEqual([
      expect.stringContaining('within a minute'),
      expect.stringContaining('restarts without Wi-Fi'),
      expect.stringContaining('jerky'),
    ]);
  });

  it('counts real pixels, so a 1280-wide browser at 1.5x is still Full HD', () => {
    expect(tvVerdict({ ...fullHd, width: 1280, height: 720, pixelRatio: 1.5 }).lines).toContainEqual({ mark: 'good', text: 'Sharp: it draws 1920 by 1080, Full HD.' });
    expect(tvVerdict({ ...fullHd, width: 1024, height: 576, pixelRatio: 1 }).lines).toContainEqual({ mark: 'warn', text: expect.stringContaining('1024 by 576') });
  });

  it('notices a TV stood on its side', () => {
    expect(tvVerdict({ ...fullHd, width: 1080, height: 1920 }).lines).toContainEqual({ mark: 'good', text: 'Sharp: it draws 1080 by 1920, standing up. Choose the Portrait layout for it.' });
  });

  it('leaves out smoothness when it could not be measured', () => {
    expect(tvVerdict({ ...fullHd, fps: null }).lines.some((line) => /smooth|jerky/i.test(line.text))).toBe(false);
  });
});
