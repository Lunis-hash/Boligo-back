import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  getReadableError: (e: any) => e?.response?.data?.message || 'err',
}));
jest.mock('@/services/cacheService', () => ({
  __esModule: true,
  default: { get: jest.fn(() => null), set: jest.fn(), clear: jest.fn() },
}));
jest.mock('@/context/auth', () => {
  const state = { token: 'jwt' as string | null };
  return { __state: state, useAuth: () => ({ token: state.token, userId: 'u1', isLoading: false }) };
});

import { AppProvider, useAppContext } from '@/context/AppContext';

const mockApi = (jest.requireMock('@/services/api') as any).default as { get: jest.Mock; post: jest.Mock };
const authState = (jest.requireMock('@/context/auth') as any).__state as { token: string | null };

const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

describe('AppContext credits', () => {
  beforeEach(() => {
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    authState.token = 'jwt';
  });

  it('loads the balance from the backend instead of a local default', async () => {
    mockApi.get.mockResolvedValue({ data: { credits: 3 } });
    const { result } = renderHook(() => useAppContext(), { wrapper });
    await waitFor(() => expect(result.current.creditsLoaded).toBe(true));
    expect(result.current.credits).toBe(3);
    expect(mockApi.get).toHaveBeenCalledWith('/credit/balance');
  });

  it('debits through POST /credit/spend and keeps the returned balance', async () => {
    mockApi.get.mockResolvedValue({ data: { credits: 2 } });
    mockApi.post.mockResolvedValue({ data: { success: true, newBalance: 1 } });
    const { result } = renderHook(() => useAppContext(), { wrapper });
    await waitFor(() => expect(result.current.creditsLoaded).toBe(true));
    let outcome: any;
    await act(async () => {
      outcome = await result.current.spendCredit(1, 'test');
    });
    expect(outcome).toEqual({ ok: true });
    expect(mockApi.post).toHaveBeenCalledWith('/credit/spend', { amount: 1, description: 'test' });
    expect(result.current.credits).toBe(1);
  });

  it('reports an insufficient balance (HTTP 400) without crashing', async () => {
    mockApi.get.mockResolvedValue({ data: { credits: 0 } });
    mockApi.post.mockRejectedValue({ response: { status: 400, data: { message: 'Solde insuffisant.' } } });
    const { result } = renderHook(() => useAppContext(), { wrapper });
    await waitFor(() => expect(result.current.creditsLoaded).toBe(true));
    let outcome: any;
    await act(async () => {
      outcome = await result.current.spendCredit();
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.insufficient).toBe(true);
    expect(outcome.reason).toBe('Solde insuffisant.');
    expect(result.current.credits).toBe(0);
  });

  it('resets credits and matches when the session is closed', async () => {
    mockApi.get.mockResolvedValue({ data: { credits: 4 } });
    const { result, rerender } = renderHook(() => useAppContext(), { wrapper });
    await waitFor(() => expect(result.current.credits).toBe(4));
    authState.token = null;
    rerender({});
    await waitFor(() => expect(result.current.credits).toBe(0));
    expect(result.current.creditsLoaded).toBe(false);
  });
});
