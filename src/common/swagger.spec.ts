import { swaggerEnabled } from './swagger';

describe('swaggerEnabled', () => {
  it('masque /docs en production', () => {
    expect(swaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('garde /docs hors production', () => {
    expect(swaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(swaggerEnabled({})).toBe(true);
  });

  it('permet de réactiver /docs en production avec SWAGGER_PUBLIC=true', () => {
    expect(
      swaggerEnabled({ NODE_ENV: 'production', SWAGGER_PUBLIC: 'true' }),
    ).toBe(true);
    expect(
      swaggerEnabled({ NODE_ENV: 'production', SWAGGER_PUBLIC: 'false' }),
    ).toBe(false);
  });
});
