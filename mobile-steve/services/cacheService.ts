/**
 * Service de cache intelligent en mémoire avec stratégie Stale-While-Revalidate
 * pour annuler les ralentissements et rechargements intempestifs des écrans.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Enregistre une valeur dans le cache avec la clé spécifiée
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Récupère la valeur en cache si elle n'est pas expirée (selon ttlMs)
   */
  get<T>(key: string, ttlMs: number = 30000): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > ttlMs;
    if (isStale) {
      return null;
    }
    return entry.data as T;
  }

  /**
   * Obtient les données actuellement stockées (même si périmées)
   * Utile pour afficher immédiatement les données pendant un rafraîchissement en arrière-plan.
   */
  peek<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }

  /**
   * Invalide une clé ou toutes les clés commençant par un préfixe
   */
  invalidate(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vide l'intégralité du cache
   */
  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
