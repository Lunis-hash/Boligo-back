/**
 * Messages de courtoisie proposés à un membre qui met fin à son parcours :
 * l'autre n'est jamais laissé sans nouvelles. Liste fermée (pas de texte
 * libre), pour qu'une sortie ne puisse pas servir à blesser.
 */
export const FAREWELLS = {
  merci:
    'Merci pour ces échanges. Je préfère m’arrêter ici, je vous souhaite le meilleur.',
  pas_compatible:
    'Je ne pense pas que nous soyons faits pour avancer ensemble. Merci pour votre sincérité.',
  pas_disponible:
    'Je ne suis plus disponible pour poursuivre ce parcours. Merci, et bonne continuation.',
} as const;

export type FarewellCode = keyof typeof FAREWELLS;

export function farewellText(code: unknown): string | null {
  return typeof code === 'string' &&
    Object.prototype.hasOwnProperty.call(FAREWELLS, code)
    ? FAREWELLS[code as FarewellCode]
    : null;
}
