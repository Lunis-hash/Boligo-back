import { Platform } from 'react-native';
import { Brand } from '@/constants/brand';

/**
 * Réglages globaux du web : fond de page de la marque et contour de saisie
 * lavande au lieu du cadre noir par défaut du navigateur.
 */
export function installWebStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('boligo-web-styles')) return;
  const style = document.createElement('style');
  style.id = 'boligo-web-styles';
  style.textContent = `
    html, body { background: ${Brand.fond}; }
    input:focus-visible, textarea:focus-visible {
      outline: 2px solid rgba(124, 92, 219, 0.45) !important;
      outline-offset: 2px;
      border-radius: 8px;
    }
    [role="button"]:focus-visible, a:focus-visible {
      outline: 2px solid rgba(198, 42, 110, 0.45);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}
