import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeliveryError, sendSignInCode } from './send-code';

vi.mock('server-only', () => ({}));

const email = { channel: 'email', value: 'owner@cafe.in' } as const;
const phone = { channel: 'phone', value: '+919876543210' } as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendSignInCode', () => {
  it('shows the code on screen in development when no provider is set up', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await sendSignInCode(email, '123456', vi.fn())).toEqual({ via: 'screen', code: '123456' });
  });

  it('shows the code on screen on a test site that opts in, even in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('SIGN_IN_CODES_ON_SCREEN', 'true');
    expect(await sendSignInCode(email, '123456', vi.fn())).toEqual({ via: 'screen', code: '123456' });
  });

  it('refuses to pretend in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TWILIO_ACCOUNT_SID', '');
    await expect(sendSignInCode(phone, '123456', vi.fn())).rejects.toMatchObject({ reason: 'not-configured' });
  });

  it('emails the code through Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('AUTH_EMAIL_FROM', 'MenuOnTV <codes@menutelly.example>');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await sendSignInCode(email, '123456', fetcher)).toEqual({ via: 'email' });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toMatchObject({ to: ['owner@cafe.in'], subject: '123456 is your MenuOnTV code' });
  });

  it('texts the code through Twilio, with the line Android uses to fill it in', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'secret');
    vi.stubEnv('TWILIO_FROM', '+15005550006');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    expect(await sendSignInCode(phone, '654321', fetcher)).toEqual({ via: 'sms' });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    const body = new URLSearchParams(init.body);
    expect(body.get('To')).toBe('+919876543210');
    expect(body.get('Body')).toMatch(/^654321 is your MenuOnTV sign-in code/);
    expect(body.get('Body')).toMatch(/#654321$/);
  });

  it('reports a provider that says no', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('AUTH_EMAIL_FROM', 'codes@menutelly.example');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 422 }));
    await expect(sendSignInCode(email, '123456', fetcher)).rejects.toBeInstanceOf(DeliveryError);
  });
});

describe('canSend', () => {
  it('needs every key for a channel', async () => {
    const { canSend } = await import('./send-code');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('AUTH_EMAIL_FROM', '');
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC1');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 't');
    vi.stubEnv('TWILIO_FROM', '+15005550006');
    expect(canSend('email')).toBe(false);
    expect(canSend('phone')).toBe(true);
  });
});
