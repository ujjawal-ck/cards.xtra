/**
 * Every OTP request carries ?device=App (API doc: /loginotp?device=App,
 * /signupotp?device=App). /signupotp was missing it, so a signup OTP was
 * issued for another device type than /signupV1 (?device=App) verifies, and
 * the right code failed with 7002 "Wrong OTP".
 */
import { loginOtp, signupOtp } from '../cashkaro';

const calls: string[] = [];

beforeEach(() => {
  calls.length = 0;
  (globalThis as any).fetch = jest.fn(async (url: string) => {
    calls.push(String(url));
    const body = String(url).includes('/token')
      ? { data: { attributes: { token: 'test-token' } } }
      : { data: { id: 'guid-1', attributes: { otp_expire_sec: 120 } } };
    return {
      ok: true,
      status: String(url).includes('otp') ? 201 : 200,
      headers: { get: () => 'application/vnd.api+json' },
      text: async () => JSON.stringify(body),
      json: async () => body,
    };
  });
});

const otpCall = (path: string) => calls.find((u) => u.includes(path));

test('signupotp sends device=App', async () => {
  await signupOtp('9876543210');
  expect(otpCall('/signupotp')).toMatch(/[?&]device=App\b/);
});

test('loginotp sends device=App', async () => {
  await loginOtp('9876543210');
  expect(otpCall('/loginotp')).toMatch(/[?&]device=App\b/);
});
