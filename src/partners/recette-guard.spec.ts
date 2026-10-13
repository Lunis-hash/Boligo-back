import {
  assertLocalDatabase,
  localDatabaseProblem,
} from '../../prisma/recette-guard';

describe('Garde-fou du seed de recette : base locale uniquement', () => {
  it.each([
    'postgresql://postgres:pw@localhost:5432/boligo_recette_partenaires',
    'postgres://u:p@127.0.0.1/recette',
  ])('accepte %s', (url) => {
    expect(localDatabaseProblem(url)).toBeNull();
  });

  it.each([
    undefined,
    '',
    'postgresql://postgres.ref:pw@aws-0-eu-west-3.pooler.supabase.com:6543/postgres',
    'postgresql://postgres:pw@db.abcdefgh.supabase.co:5432/postgres',
    'postgresql://u:p@10.0.0.5:5432/x',
    'postgresql://u:p@boligo-db.render.com/x',
    'mysql://u:p@localhost/x',
  ])('refuse %s', (url) => {
    expect(localDatabaseProblem(url)).not.toBeNull();
    expect(() => assertLocalDatabase(url)).toThrow(/Refusé/);
  });
});
