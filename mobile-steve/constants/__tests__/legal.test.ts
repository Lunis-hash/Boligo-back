import legal from '@/constants/legal.json';

const docs = [legal.cgu, legal.privacy];

describe('Textes légaux (CGU et politique de confidentialité)', () => {
  it('porte une date de version', () => {
    expect(legal.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('est structuré en sections numérotées non vides avec des identifiants uniques', () => {
    for (const doc of docs) {
      expect(doc.sections.length).toBeGreaterThanOrEqual(10);
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      doc.sections.forEach((s, i) => {
        expect(s.title).toMatch(new RegExp(`^${i + 1}\\. `));
        expect(s.paragraphs.length).toBeGreaterThan(0);
        s.paragraphs.forEach((p) => expect(p.trim().length).toBeGreaterThan(20));
      });
    }
  });

  it('reflète les règles métier de BOLIGO', () => {
    const cgu = JSON.stringify(legal.cgu);
    expect(cgu).toMatch(/15 € TTC/);
    expect(cgu).toMatch(/sept par jour/);
    expect(cgu).toMatch(/sept minutes/);
    expect(cgu).toMatch(/consentent expressément/);
    expect(cgu).toMatch(/48 heures/);
    expect(cgu).toMatch(/18 ans/);
    const privacy = JSON.stringify(legal.privacy);
    expect(privacy).toMatch(/RGPD/);
    expect(privacy).toMatch(/CNIL/);
    expect(privacy).toMatch(/consentement explicite/);
    expect(privacy).toMatch(/Supabase/);
    expect(privacy).toMatch(/Stripe/);
  });

  it("signale clairement les mentions que l'éditeur doit compléter", () => {
    const placeholders = Object.values(legal.company).filter((v) => v.startsWith('[À COMPLÉTER'));
    expect(placeholders.length).toBeGreaterThanOrEqual(5);
    const all = JSON.stringify(docs);
    placeholders.forEach((p) => expect(all).toContain(p));
  });

  it('donne une seule adresse de contact BOLIGO, sur le domaine boligo.fr', () => {
    expect(legal.company.contactEmail).toBe('contact@boligo.fr');
    expect(legal.company.dpoEmail).toBe('contact@boligo.fr');
    const all = JSON.stringify(docs);
    expect(all).toContain('contact@boligo.fr');
    expect(all).not.toMatch(/@boligo\.app|@harmonie\.app/);
  });
});
