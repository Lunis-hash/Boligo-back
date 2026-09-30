import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { registerForPushNotificationsAsync } from '@/services/notifications';
import { disconnectChatSocket } from '@/services/chatSocket';
import cacheService from '@/services/cacheService';

declare const __DEV__: boolean;

interface AuthContextType {
  token: string | null;
  userId: string | null;
  isLoading: boolean;
  signIn: (token: string, userId: string, refreshToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let globalSignOut: (() => Promise<void>) | null = null;

/** Déconnexion déclenchée hors React (intercepteur API sur refresh impossible). */
export const triggerGlobalSignOut = async () => {
  if (globalSignOut) await globalSignOut();
};

const toStr = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value) return '';
  if (typeof value === 'object') {
    const v = value as any;
    return v.id ? String(v.id) : v._id ? String(v._id) : '';
  }
  return String(value);
};

function schedulePushRegistration(delayMs: number) {
  setTimeout(() => {
    registerForPushNotificationsAsync().catch((err: unknown) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔔 [Auth] Push non enregistré :', err);
    });
  }, delayMs);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedToken, storedId] = await Promise.all([
          storage.getItem(STORAGE_KEYS.accessToken),
          storage.getItem(STORAGE_KEYS.userId),
        ]);
        if (!mounted) return;
        if (storedToken) {
          setToken(storedToken);
          setUserId(storedId);
          schedulePushRegistration(1000);
        }
      } catch (e) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('❌ [Auth] Lecture session impossible', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (newToken: unknown, newId: unknown, newRefreshToken?: unknown) => {
    const tokenStr = toStr(newToken);
    const idStr = toStr(newId);
    const refreshStr = toStr(newRefreshToken);

    // Nouvelle session : on repart sans données de l'utilisateur précédent.
    cacheService.clear();
    disconnectChatSocket();

    if (tokenStr) {
      await storage.setItem(STORAGE_KEYS.accessToken, tokenStr);
      setToken(tokenStr);
    }
    if (idStr) {
      await storage.setItem(STORAGE_KEYS.userId, idStr);
      setUserId(idStr);
    }
    if (refreshStr) {
      await storage.setItem(STORAGE_KEYS.refreshToken, refreshStr);
    }

    schedulePushRegistration(500);
  }, []);

  const signOut = useCallback(async () => {
    disconnectChatSocket();
    cacheService.clear();
    await storage.clearSession();
    setToken(null);
    setUserId(null);
    try {
      const { router } = require('expo-router');
      router.replace('/(auth)/login');
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('⚠️ [Auth] Redirection login impossible :', e);
    }
  }, []);

  useEffect(() => {
    globalSignOut = signOut;
    return () => {
      if (globalSignOut === signOut) globalSignOut = null;
    };
  }, [signOut]);

  const value = useMemo(
    () => ({ token, userId, isLoading, signIn, signOut }),
    [token, userId, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
