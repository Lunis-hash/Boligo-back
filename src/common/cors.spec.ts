import { adminOrigins, corsOptionsFor, DEFAULT_ADMIN_ORIGINS } from './cors';

describe('CORS', () => {
  const allowed = adminOrigins();

  it('garde l’application et le site ouverts à toutes les origines', () => {
    expect(corsOptionsFor('/api/auth/login', allowed).origin).toBe(true);
    expect(
      corsOptionsFor('/api/matching/discover?page=1', allowed).origin,
    ).toBe(true);
    expect(corsOptionsFor(undefined, allowed).origin).toBe(true);
  });

  it('limite le tableau de bord admin à ses adresses BOLIGO', () => {
    for (const url of [
      '/api/admin/auth/login',
      '/api/admin/users?page=2',
      '/api/admin',
    ]) {
      expect(corsOptionsFor(url, allowed).origin).toEqual(allowed);
    }
    expect(allowed).toContain('https://boligo-admin.onrender.com');
    expect(allowed).not.toContain('https://boligo-admin.vercel.app');
  });

  it('ne confond pas une route voisine avec l’admin', () => {
    expect(corsOptionsFor('/api/administration', allowed).origin).toBe(true);
  });

  it('ajoute les origines de ADMIN_ALLOWED_ORIGINS, sans doublon ni barre finale', () => {
    const list = adminOrigins(
      ' https://admin.exemple.fr/ ,http://localhost:3001',
    );
    expect(list).toEqual([
      ...DEFAULT_ADMIN_ORIGINS,
      'https://admin.exemple.fr',
    ]);
  });
});
