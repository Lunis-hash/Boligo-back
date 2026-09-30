import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import client, { getReadableError } from '@/services/api';
import cacheService from '@/services/cacheService';
import { useAuth } from '@/context/auth';

declare const __DEV__: boolean;

export interface SpendResult {
  ok: boolean;
  /** Message d'erreur lisible si ok === false. */
  reason?: string;
  /** true si le refus vient d'un solde insuffisant (HTTP 400). */
  insufficient?: boolean;
}

interface AppContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  activeJourneyId: string | null;
  setActiveJourneyId: (id: string | null) => void;
  userState: any;
  setUserState: (state: any) => void;
  /** Solde de crédits tel que connu du backend (source de vérité). */
  credits: number;
  creditsLoaded: boolean;
  refreshCredits: () => Promise<number>;
  /** Débite des crédits côté backend (POST /credit/spend). */
  spendCredit: (amount?: number, description?: string) => Promise<SpendResult>;
  matches: any[];
  addMatch: (match: any) => void;
  loadMatches: (forceRefresh?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MATCHES_CACHE_KEY = 'user_my_matches';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [userState, setUserState] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [creditsLoaded, setCreditsLoaded] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await client.get<{ credits: number }>('/credit/balance');
      const balance = typeof res.data?.credits === 'number' ? res.data.credits : 0;
      setCredits(balance);
      setCreditsLoaded(true);
      return balance;
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('⚠️ [AppContext] Solde de crédits indisponible :', getReadableError(e));
      return credits;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spendCredit = useCallback(
    async (amount = 1, description = 'Connexion BOLIGO'): Promise<SpendResult> => {
      try {
        const res = await client.post<{ success: boolean; newBalance: number }>('/credit/spend', { amount, description });
        if (typeof res.data?.newBalance === 'number') setCredits(res.data.newBalance);
        return { ok: true };
      } catch (e: any) {
        const status = e?.response?.status;
        await refreshCredits();
        return { ok: false, reason: getReadableError(e), insufficient: status === 400 };
      }
    },
    [refreshCredits],
  );

  const addMatch = useCallback((match: any) => {
    setMatches((prev) => [...prev, match]);
  }, []);

  const loadMatches = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = cacheService.get<any[]>(MATCHES_CACHE_KEY, 20000);
      if (cached) {
        setMatches(cached);
        return;
      }
    }
    try {
      const res = await client.get('/matching/my-matches');
      const data = res.data ?? [];
      setMatches(data);
      cacheService.set(MATCHES_CACHE_KEY, data);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('⚠️ [AppContext] Matchs indisponibles :', getReadableError(e));
    }
  }, []);

  // Session ouverte → on charge le solde réel ; session fermée → on vide l'état.
  useEffect(() => {
    if (token) {
      refreshCredits();
    } else {
      setCredits(0);
      setCreditsLoaded(false);
      setMatches([]);
      setActiveJourneyId(null);
      setUnreadCount(0);
      setUserState(null);
    }
  }, [token, refreshCredits]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      activeJourneyId,
      setActiveJourneyId,
      userState,
      setUserState,
      credits,
      creditsLoaded,
      refreshCredits,
      spendCredit,
      matches,
      addMatch,
      loadMatches,
    }),
    [unreadCount, activeJourneyId, userState, credits, creditsLoaded, refreshCredits, spendCredit, matches, addMatch, loadMatches],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
