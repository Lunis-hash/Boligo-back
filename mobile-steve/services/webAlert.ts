import { Alert, AlertButton, Platform } from 'react-native';

/**
 * react-native-web n'implémente pas Alert.alert (aucune boîte de dialogue,
 * les callbacks ne sont jamais appelés : déconnexion, confirmation…).
 * Sur le web, les messages passent par une fenêtre aux couleurs de BOLIGO
 * (components/WebAlertHost) plutôt que par les boîtes grises du navigateur.
 */

export interface WebDialog {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type Listener = (queue: WebDialog[]) => void;

let queue: WebDialog[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(queue));
}

/** Abonnement de la fenêtre de dialogue (une seule instance, montée à la racine). */
export function subscribeWebDialogs(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
}

/** Ferme la fenêtre au premier plan puis exécute l'action du bouton choisi. */
export function resolveWebDialog(id: number, button?: AlertButton) {
  queue = queue.filter((d) => d.id !== id);
  emit();
  button?.onPress?.();
}

/** Ajoute un message à la file. Sans bouton fourni, un simple « OK ». */
export function showWebDialog(title: string, message?: string, buttons?: AlertButton[]) {
  queue = [...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] }];
  emit();
}

export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    // Fenêtre de marque si elle est montée ; sinon (tout début de chargement), le navigateur.
    if (listeners.size > 0) {
      showWebDialog(title, message, buttons);
      return;
    }
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((x) => x.style === 'cancel');
    const confirm = [...buttons].reverse().find((x) => x.style !== 'cancel') ?? buttons[buttons.length - 1];
    (window.confirm(text) ? confirm : cancel)?.onPress?.();
  };
}
