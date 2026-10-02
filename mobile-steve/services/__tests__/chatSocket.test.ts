type Handler = (...args: any[]) => void;

const mockSockets: any[] = [];
const mockIo = jest.fn((url: string, opts: any) => {
  const handlers: Record<string, Handler[]> = {};
  const socket = {
    url,
    opts,
    connected: false,
    emit: jest.fn(),
    on: jest.fn((event: string, cb: Handler) => {
      (handlers[event] ||= []).push(cb);
    }),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    connect: jest.fn(function (this: any) {
      socket.connected = true;
      (handlers['connect'] || []).forEach((h) => h());
    }),
    disconnect: jest.fn(function (this: any) {
      socket.connected = false;
    }),
    _handlers: handlers,
  };
  mockSockets.push(socket);
  return socket;
});

jest.mock('socket.io-client', () => ({ io: (url: string, opts: any) => mockIo(url, opts) }));
jest.mock('@/services/api', () => ({ __esModule: true, default: {}, SOCKET_URL: 'http://backend.test' }));

const mockStore = new Map<string, string>();
jest.mock('@/services/storage', () => ({
  __esModule: true,
  storage: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
    removeItem: jest.fn(async (k: string) => void mockStore.delete(k)),
    clearSession: jest.fn(async () => mockStore.clear()),
  },
  STORAGE_KEYS: { accessToken: 'userToken', refreshToken: 'refreshToken', userId: 'userId' },
}));

import {
  connectChatSocket,
  disconnectChatSocket,
  joinJourneyRoom,
  leaveJourneyRoom,
  markJourneyAsRead,
  SOCKET_EVENTS,
} from '@/services/chatSocket';

describe('chatSocket', () => {
  beforeEach(() => {
    mockSockets.length = 0;
    mockIo.mockClear();
    mockStore.clear();
    disconnectChatSocket();
  });

  it('refuses to connect without a session token', async () => {
    await expect(connectChatSocket()).rejects.toThrow(/non authentifié/);
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('connects to the backend origin with the JWT in the handshake auth', async () => {
    mockStore.set('userToken', 'jwt-A');
    const socket = await connectChatSocket();
    expect(mockIo).toHaveBeenCalledWith('http://backend.test', expect.objectContaining({ transports: ['websocket'] }));
    const auth = mockSockets[0].opts.auth;
    const payload = await new Promise((resolve) => auth(resolve));
    expect(payload).toEqual({ token: 'jwt-A' });
    expect(socket.connected).toBe(true);
  });

  it('reuses a single instance and uses the gateway event names', async () => {
    mockStore.set('userToken', 'jwt-A');
    await joinJourneyRoom('j1');
    await joinJourneyRoom('j1');
    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockSockets[0].emit).toHaveBeenCalledWith(SOCKET_EVENTS.joinJourney, { journeyId: 'j1' });
    expect(SOCKET_EVENTS.joinJourney).toBe('joinJourney');
    markJourneyAsRead('j1');
    expect(mockSockets[0].emit).toHaveBeenCalledWith('markAsRead', { journeyId: 'j1' });
    leaveJourneyRoom('j1');
    expect(mockSockets[0].emit).toHaveBeenCalledWith('leaveJourney', { journeyId: 'j1' });
  });

  it('re-joins open conversations after a reconnection', async () => {
    mockStore.set('userToken', 'jwt-A');
    await joinJourneyRoom('j1');
    const socket = mockSockets[0];
    socket.emit.mockClear();
    socket._handlers['connect'].forEach((h: Handler) => h());
    expect(socket.emit).toHaveBeenCalledWith('joinJourney', { journeyId: 'j1' });
  });

  it('drops the previous socket when another user signs in', async () => {
    mockStore.set('userToken', 'jwt-A');
    await joinJourneyRoom('j1');
    mockStore.set('userToken', 'jwt-B');
    await connectChatSocket();
    expect(mockSockets).toHaveLength(2);
    expect(mockSockets[0].disconnect).toHaveBeenCalled();
    expect(mockSockets[0].removeAllListeners).toHaveBeenCalled();
    // rooms of the previous user are forgotten
    mockSockets[1].emit.mockClear();
    mockSockets[1]._handlers['connect'].forEach((h: Handler) => h());
    expect(mockSockets[1].emit).not.toHaveBeenCalled();
  });

  it('disconnectChatSocket tears everything down', async () => {
    mockStore.set('userToken', 'jwt-A');
    await connectChatSocket();
    disconnectChatSocket();
    expect(mockSockets[0].disconnect).toHaveBeenCalled();
    await expect(connectChatSocket()).resolves.toBeDefined();
    expect(mockSockets).toHaveLength(2);
  });
});
