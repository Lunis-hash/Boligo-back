import { PRODUCTION_API_URL, resolveApiUrl } from '@/services/api';

describe('resolveApiUrl', () => {
  it('uses a remote EXPO_PUBLIC_API_URL on every platform', () => {
    expect(resolveApiUrl({ envUrl: 'https://api.example.com/api', platform: 'ios' })).toBe('https://api.example.com/api');
    expect(resolveApiUrl({ envUrl: 'https://api.example.com/api', hostUri: '192.168.1.10:8081', platform: 'android' })).toBe(
      'https://api.example.com/api',
    );
  });

  it('keeps a localhost URL on the web, where the browser can reach it', () => {
    expect(resolveApiUrl({ envUrl: 'http://localhost:3000/api', hostUri: 'http://localhost:8081', platform: 'web' })).toBe(
      'http://localhost:3000/api',
    );
  });

  it('never derives a host from the experience URL on the web', () => {
    expect(resolveApiUrl({ hostUri: 'http://localhost:8081', platform: 'web' })).toBe(PRODUCTION_API_URL);
  });

  it('targets the dev machine serving the bundle on native when the env URL is loopback', () => {
    expect(resolveApiUrl({ envUrl: 'http://localhost:3000/api', hostUri: '192.168.1.10:8081', platform: 'ios' })).toBe(
      'http://192.168.1.10:3000/api',
    );
    expect(resolveApiUrl({ hostUri: 'exp://10.0.0.5:8081', platform: 'android' })).toBe('http://10.0.0.5:3000/api');
  });

  it('falls back to production when nothing usable is configured', () => {
    expect(resolveApiUrl({ platform: 'ios' })).toBe(PRODUCTION_API_URL);
    expect(resolveApiUrl({ hostUri: 'localhost:8081', platform: 'ios' })).toBe(PRODUCTION_API_URL);
    expect(resolveApiUrl({ envUrl: '   ', platform: 'android' })).toBe(PRODUCTION_API_URL);
  });
});
