import React from 'react';

/**
 * Variante web du module Stripe : le SDK natif n'existe pas sur le web.
 * Le fournisseur est transparent et useStripe() renvoie des opérations qui
 * échouent proprement (l'écran de paiement affiche un message explicite).
 */
type ProviderProps = { publishableKey?: string; children?: React.ReactNode };

export function StripeProvider({ children }: ProviderProps) {
  return React.createElement(React.Fragment, null, children);
}

const unavailable = { code: 'Failed', message: "Le paiement par carte n'est disponible que dans l'application mobile." };

export function useStripe() {
  return {
    initPaymentSheet: async (_params?: unknown) => ({ error: unavailable }),
    presentPaymentSheet: async () => ({ error: unavailable }),
  };
}
