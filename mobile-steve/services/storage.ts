import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Stockage sécurisé des jetons de session.
 *
 * - iOS / Android : expo-secure-store (Keychain / Keystore).
 * - Web : expo-secure-store n'est pas disponible ; on retombe sur
 *   localStorage pour que l'app reste utilisable (tests navigateur, Expo web).
 *
 * Toutes les opérations sont tolérantes aux pannes : une erreur de stockage
 * ne doit jamais faire planter l'application.
 */
export const STORAGE_KEYS = {
  accessToken: 'userToken',
  refreshToken: 'refreshToken',
  userId: 'userId',
} as const;

const memoryFallback = new Map<string, string>();

function webStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return (globalThis as any).localStorage as Storage;
    }
  } catch {
    /* localStorage inaccessible (mode privé, iframe…) */
  }
  return null;
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const ls = webStorage();
      return ls ? ls.getItem(key) : memoryFallback.get(key) ?? null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memoryFallback.set(key, value);
  try {
    if (Platform.OS === 'web') {
      webStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* on garde la valeur en mémoire pour la session courante */
  }
}

export async function removeItem(key: string): Promise<void> {
  memoryFallback.delete(key);
  try {
    if (Platform.OS === 'web') {
      webStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((k) => removeItem(k)));
}

export const storage = { getItem, setItem, removeItem, clearSession, KEYS: STORAGE_KEYS };
export default storage;
