import { Alert, Linking } from 'react-native';
import {
  createSingleFlight,
  isHttpsUrl,
  openUrl,
  OPEN_LINK_FAILED_MESSAGE,
  urlScheme,
} from '../openUrl';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));

const openURL = Linking.openURL as jest.Mock;
const alertFn = Alert.alert as jest.Mock;

describe('isHttpsUrl / urlScheme', () => {
  it('accepts https only', () => {
    expect(isHttpsUrl('https://example.com/a?id=1')).toBe(true);
    expect(isHttpsUrl('  https://example.com ')).toBe(true);
    expect(isHttpsUrl('http://example.com')).toBe(false);
    expect(isHttpsUrl('intent://x#Intent;end')).toBe(false);
    expect(isHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpsUrl('myapp://open')).toBe(false);
    expect(isHttpsUrl('https://')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
    expect(isHttpsUrl(null)).toBe(false);
  });
  it('reads the scheme in lower case', () => {
    expect(urlScheme('MAILTO:a@b.com')).toBe('mailto');
    expect(urlScheme('no scheme')).toBeNull();
  });
});

describe('openUrl', () => {
  beforeEach(() => openURL.mockResolvedValue(undefined));

  it('opens an https link and resolves true', async () => {
    await expect(openUrl('https://example.com')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('https://example.com');
    expect(alertFn).not.toHaveBeenCalled();
  });

  it('opens a plain http click-out (partner trackers may not all be https)', async () => {
    await expect(openUrl('http://track.example.com/click?p1=1', { httpsOnly: true })).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('http://track.example.com/click?p1=1');
  });

  it.each(['intent://x#Intent;end', 'javascript:alert(1)', 'myapp://x', 'http://', '', '   '])(
    'refuses %p, shows the message, never calls Linking',
    async (u) => {
      await expect(openUrl(u, { httpsOnly: true })).resolves.toBe(false);
      expect(openURL).not.toHaveBeenCalled();
      expect(alertFn).toHaveBeenCalledWith(expect.any(String), OPEN_LINK_FAILED_MESSAGE);
    }
  );

  it('keeps mailto and tel working for help links', async () => {
    await expect(openUrl('mailto:help@example.com')).resolves.toBe(true);
    await expect(openUrl('tel:+911234567890')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledTimes(2);
  });

  it('refuses mailto and tel when httpsOnly (click-outs)', async () => {
    await expect(openUrl('mailto:a@b.com', { httpsOnly: true })).resolves.toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });

  it('shows the message when openURL rejects', async () => {
    openURL.mockRejectedValue(new Error('no handler'));
    await expect(openUrl('https://example.com')).resolves.toBe(false);
    expect(alertFn).toHaveBeenCalledWith(expect.any(String), OPEN_LINK_FAILED_MESSAGE);
  });

  it('shows the address when mailto fails', async () => {
    openURL.mockRejectedValue(new Error('no mail app'));
    await expect(openUrl('mailto:help@example.com?subject=Hi')).resolves.toBe(false);
    expect(alertFn.mock.calls[0][1]).toContain('help@example.com');
  });
});

describe('createSingleFlight', () => {
  it('ignores a second call while the first is running (double tap opens once)', async () => {
    const flight = createSingleFlight();
    let release!: () => void;
    const open = jest.fn(() => new Promise<void>((r) => (release = r)));
    const states: boolean[] = [];
    const first = flight.run(open, (b) => states.push(b));
    const second = flight.run(open, (b) => states.push(b));
    expect(flight.isBusy()).toBe(true);
    release();
    await first;
    await expect(second).resolves.toBeUndefined();
    expect(open).toHaveBeenCalledTimes(1);
    expect(states).toEqual([true, false]);
    expect(flight.isBusy()).toBe(false);
  });

  it('frees the guard after a throw', async () => {
    const flight = createSingleFlight();
    await expect(flight.run(async () => { throw new Error('x'); })).rejects.toThrow('x');
    await expect(flight.run(async () => 5)).resolves.toBe(5);
  });
});
