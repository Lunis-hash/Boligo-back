import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlertButton } from 'react-native';
import { Brand } from '@/constants/brand';
import { Typography } from '@/constants/theme';
import { WebDialog, resolveWebDialog, subscribeWebDialogs } from '@/services/webAlert';

/**
 * Fenêtre de dialogue du web (remplace les boîtes grises du navigateur).
 * Échap = annuler ; Entrée = action principale.
 */
export function WebAlertHost() {
  const [queue, setQueue] = useState<WebDialog[]>([]);
  useEffect(() => subscribeWebDialogs(setQueue), []);
  const dialog = queue[0];

  useEffect(() => {
    if (!dialog || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveWebDialog(dialog.id, cancelOf(dialog.buttons));
      if (e.key === 'Enter') resolveWebDialog(dialog.id, primaryOf(dialog.buttons));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  if (Platform.OS !== 'web' || !dialog) return null;

  // Annuler à gauche, action principale à droite, comme sur iOS et Android.
  const ordered = [...dialog.buttons].sort((a, b) => rank(a) - rank(b));

  return (
    <View style={styles.backdrop} accessibilityViewIsModal testID="app-dialog">
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title} testID="app-dialog-title">
          {dialog.title}
        </Text>
        {dialog.message ? (
          <Text style={styles.message} testID="app-dialog-message">
            {dialog.message}
          </Text>
        ) : null}
        <View style={[styles.actions, ordered.length > 2 && styles.actionsStacked]}>
          {ordered.map((button, i) => {
            const primary = button === primaryOf(dialog.buttons);
            const danger = button.style === 'destructive';
            const cancel = button.style === 'cancel';
            return (
              <Pressable
                key={`${button.text ?? 'ok'}-${i}`}
                onPress={() => resolveWebDialog(dialog.id, button)}
                accessibilityRole="button"
                testID={primary ? 'app-dialog-confirm' : cancel ? 'app-dialog-cancel' : undefined}
                style={({ hovered }: { hovered?: boolean }) => [
                  styles.button,
                  ordered.length > 2 && styles.buttonStacked,
                  cancel || !primary ? styles.buttonQuiet : danger ? styles.buttonDanger : styles.buttonMain,
                  hovered && { opacity: 0.88 },
                ]}
              >
                <Text style={[styles.buttonText, (cancel || !primary) && styles.buttonTextQuiet]}>
                  {button.text ?? 'OK'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function rank(b: AlertButton) {
  return b.style === 'cancel' ? 0 : b.style === 'destructive' ? 2 : 1;
}

function cancelOf(buttons: AlertButton[]) {
  return buttons.find((b) => b.style === 'cancel') ?? (buttons.length === 1 ? buttons[0] : undefined);
}

/** Action principale : la dernière qui n'annule pas (convention d'Alert.alert). */
function primaryOf(buttons: AlertButton[]) {
  return [...buttons].reverse().find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'rgba(42,27,61,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Brand.blanc,
    borderRadius: 20,
    padding: 24,
    shadowColor: Brand.nuit,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
  },
  title: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    color: Brand.encre,
    marginBottom: 8,
  },
  message: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Brand.encreDouce,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  actionsStacked: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  button: { borderRadius: 999, paddingVertical: 11, paddingHorizontal: 20, alignItems: 'center' },
  buttonStacked: { width: '100%' },
  buttonMain: { backgroundColor: Brand.framboise },
  buttonDanger: { backgroundColor: Brand.danger },
  buttonQuiet: { backgroundColor: Brand.blanc, borderWidth: 1, borderColor: Brand.bordLilas },
  buttonText: { fontFamily: Typography.fontFamily.bold, fontSize: 14.5, color: '#FFFFFF' },
  buttonTextQuiet: { color: Brand.encreDouce },
});
