import { Alert, AlertButton, Platform } from 'react-native';

/**
 * react-native-web n'implémente pas Alert.alert (aucune boîte de dialogue,
 * les callbacks ne sont jamais appelés : déconnexion, confirmation…).
 * Sur le web on s'appuie sur window.alert / window.confirm pour conserver le
 * comportement (et permettre la recette navigateur).
 */
export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === 'cancel');
    const confirm = [...buttons].reverse().find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
    const accepted = window.confirm(`${text}\n\n[OK] ${confirm.text ?? 'OK'} · [Annuler] ${cancel?.text ?? 'Annuler'}`);
    (accepted ? confirm : cancel)?.onPress?.();
  };
}
