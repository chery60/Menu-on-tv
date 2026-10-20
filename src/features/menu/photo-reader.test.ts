import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import type { MenuReading } from './photo-import';
import { canReadMenuPhotos, MENU_READER_MODEL, MenuPhotoError, readMenuPhoto, type MenuReaderClient } from './photo-reader';

const READING: MenuReading = { dishes: [{ category: 'Chai', name: 'Masala chai', nameHi: '', diet: 'veg', prices: [{ label: '', rupees: 30 }], unsure: [] }], problem: '' };
const PHOTO = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), type: 'image/jpeg' as const };

function fakeClient(response: { stop_reason: string; parsed_output: MenuReading | null }) {
  const parse = vi.fn<(params: Record<string, unknown>) => Promise<typeof response>>(async () => response);
  return { parse, client: { beta: { messages: { parse } } } as unknown as MenuReaderClient };
}

describe('reading a menu photo', () => {
  it('sends the photo to the model and returns what it read, already checked against the schema', async () => {
    const { parse, client } = fakeClient({ stop_reason: 'end_turn', parsed_output: READING });
    await expect(readMenuPhoto(PHOTO, client)).resolves.toEqual(READING);
    const params = parse.mock.calls[0][0] as { model: string; fallbacks: unknown; betas: string[]; output_config: { format: unknown }; messages: { content: { type: string; source?: { media_type: string; data: string } }[] }[] };
    expect(params.model).toBe(MENU_READER_MODEL);
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toContain('server-side-fallback-2026-07-01');
    expect(params.output_config.format).toBeDefined();
    expect(params.messages[0].content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg', data: Buffer.from(PHOTO.bytes).toString('base64') } });
  });

  it('tells the owner plainly when the model declines the photo', async () => {
    const { client } = fakeClient({ stop_reason: 'refusal', parsed_output: null });
    await expect(readMenuPhoto(PHOTO, client)).rejects.toThrow(MenuPhotoError);
  });

  it('asks for one part of the menu at a time when a photo holds too much to read at once', async () => {
    const { client } = fakeClient({ stop_reason: 'max_tokens', parsed_output: null });
    await expect(readMenuPhoto(PHOTO, client)).rejects.toThrow(/one part of the menu at a time/);
  });

  it('treats an answer that doesn’t fit the schema as a fault to log, not an owner mistake', async () => {
    const { client } = fakeClient({ stop_reason: 'end_turn', parsed_output: null });
    const error = await readMenuPhoto(PHOTO, client).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(MenuPhotoError);
  });
});

describe('whether this server can read menu photos', () => {
  const SOURCES = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_IDENTITY_TOKEN_FILE', 'ANTHROPIC_PROFILE', 'ANTHROPIC_CONFIG_DIR'];

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is off with no credentials, so owners are offered paste instead of a reader that always fails', () => {
    for (const name of SOURCES) vi.stubEnv(name, '');
    expect(canReadMenuPhotos()).toBe(false);
  });

  it('is on with any credentials the SDK can use: a key, a token, federation or a named profile', () => {
    for (const source of SOURCES) {
      for (const name of SOURCES) vi.stubEnv(name, name === source ? 'set' : '');
      expect(canReadMenuPhotos()).toBe(true);
    }
  });
});
