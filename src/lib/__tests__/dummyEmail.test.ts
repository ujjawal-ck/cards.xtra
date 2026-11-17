import { dummyEmail, randomPassword } from '../eccentricName';

describe('dummyEmail', () => {
  it('is keyed to the phone number', () => {
    expect(dummyEmail('9876543210')).toBe('cardsxtra.9876543210@cashkaro-demo.app');
  });

  it('keeps digits only', () => {
    expect(dummyEmail('98765-43210')).toBe('cardsxtra.9876543210@cashkaro-demo.app');
  });

  it('gives a different email for a different phone', () => {
    expect(dummyEmail('9876543210')).not.toBe(dummyEmail('9876543211'));
  });
});

describe('randomPassword', () => {
  it('is 20 characters and differs between calls', () => {
    const a = randomPassword();
    expect(a).toHaveLength(20);
    expect(a).not.toBe(randomPassword());
  });
});
