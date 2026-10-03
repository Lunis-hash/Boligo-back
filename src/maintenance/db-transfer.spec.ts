import { insertionOrder, safeHost } from './db-transfer';

describe('transfert de base BOLIGO', () => {
  it('copie les tables parentes avant les tables qui les référencent', () => {
    const order = insertionOrder(
      ['Message', 'Journey', 'User', 'MatchProposal'],
      [
        { child: 'Message', parent: 'Journey' },
        { child: 'Journey', parent: 'MatchProposal' },
        { child: 'Journey', parent: 'User' },
        { child: 'MatchProposal', parent: 'User' },
        { child: 'User', parent: 'User' },
      ],
    );
    expect(order.indexOf('User')).toBeLessThan(order.indexOf('MatchProposal'));
    expect(order.indexOf('MatchProposal')).toBeLessThan(order.indexOf('Journey'));
    expect(order.indexOf('Journey')).toBeLessThan(order.indexOf('Message'));
  });

  it('refuse un cycle de clés étrangères au lieu de copier dans le désordre', () => {
    expect(() =>
      insertionOrder(['A', 'B'], [
        { child: 'A', parent: 'B' },
        { child: 'B', parent: 'A' },
      ]),
    ).toThrow('Cycle');
  });

  it("n'écrit jamais d'identifiants dans les journaux", () => {
    expect(safeHost('postgresql://boligo:secret@dpg-x.frankfurt-postgres.render.com:5432/boligo')).toBe(
      'dpg-x.frankfurt-postgres.render.com:5432',
    );
    expect(safeHost('pas une url')).toBe('adresse invalide');
  });
});
