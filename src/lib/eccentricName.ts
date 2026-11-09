/**
 * eccentricName.ts — playful auto-names + behind-the-scenes signup credentials.
 *
 * The signup flow only asks the user for a phone number; CashKaro's /signupV1
 * still requires a fullname, email and password. We generate all three here:
 *   - eccentricName()  → a fun two-word handle ("Cosmic Maharaja") used as the
 *     signup fullname AND as the fallback when a first-timer skips the
 *     "what should we call you?" prompt on Home.
 *   - dummyEmail()     → a deterministic, valid-format throwaway address keyed
 *     to the phone number (never shown to the user).
 *   - randomPassword() → a throwaway strong-ish password (never shown; the app
 *     only ever logs in via OTP, so the user never types it).
 */

// Brand-friendly, upbeat word lists — nothing edgy; reads as a fun nickname.
const ADJECTIVES = [
  'Cosmic', 'Mystic', 'Velvet', 'Golden', 'Electric', 'Midnight', 'Royal',
  'Turbo', 'Neon', 'Dapper', 'Cheeky', 'Maverick', 'Quantum', 'Dazzling',
  'Stellar', 'Breezy', 'Snazzy', 'Jolly', 'Swift', 'Lucky',
];
const NOUNS = [
  'Falcon', 'Maharaja', 'Tiger', 'Panda', 'Rocket', 'Wizard', 'Nawab',
  'Phoenix', 'Mongoose', 'Comet', 'Tycoon', 'Ninja', 'Rockstar', 'Voyager',
  'Cheetah', 'Otter', 'Maestro', 'Dynamo', 'Sphinx', 'Pioneer',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** A fun two-word handle, e.g. "Velvet Tiger". */
export function eccentricName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}

/** Throwaway password for signup (OTP-only app — never typed by the user). */
export function randomPassword(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  // Guarantee the mix most validators want.
  return `Ck1!${out}`;
}
