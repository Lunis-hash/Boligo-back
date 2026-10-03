import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const mockClearSession = jest.fn();
const mockSignOut = jest.fn();
const mockRefresh = jest.fn();

jest.mock('../storage', () => ({
  STORAGE_KEYS: { accessToken: 'access', refreshToken: 'refresh' },
  storage: {
    getItem: jest.fn(async () => 'refresh-token'),
    setItem: jest.fn(async () => undefined),
    clearSession: () => mockClearSession(),
  },
}));
jest.mock('../../context/auth', () => ({ triggerGlobalSignOut: () => mockSignOut() }));
jest.mock('../auth', () => ({ AuthService: { refresh: (token: string) => mockRefresh(token) } }));

import client from '@/services/api';

/** Toute requête protégée répond 401 (jeton d'accès expiré). */
function expiredAccessAdapter(config: InternalAxiosRequestConfig) {
  return Promise.reject(
    new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
      data: {},
    }),
  );
}

function refreshError(status?: number) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    status ? 'Refused' : 'Network Error',
    status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK',
    config,
    null,
    status ? { status, statusText: '', headers: {}, config, data: {} } : undefined,
  );
}

describe('rafraîchissement de session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.defaults.adapter = expiredAccessAdapter;
  });

  it('garde la session quand le serveur est injoignable pendant le rafraîchissement', async () => {
    mockRefresh.mockRejectedValue(refreshError());
    await expect(client.get('/profile/me')).rejects.toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClearSession).not.toHaveBeenCalled();
  });

  it('garde la session sur une erreur serveur (503 au réveil)', async () => {
    mockRefresh.mockRejectedValue(refreshError(503));
    await expect(client.get('/profile/me')).rejects.toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('déconnecte quand le serveur refuse le jeton de rafraîchissement', async () => {
    mockRefresh.mockRejectedValue(refreshError(401));
    await expect(client.get('/profile/me')).rejects.toBeTruthy();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
