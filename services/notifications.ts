import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import client from './api';

declare const __DEV__: boolean;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const debug = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

let handlerConfigured = false;

/** Affiche les notifications reçues quand l'app est au premier plan. */
export function configureNotificationHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Demande la permission, récupère le jeton Expo Push et l'enregistre côté
 * backend (POST /notifications/push-token). Retourne le jeton ou null.
 *
 * Limites connues : les notifications distantes ne fonctionnent pas sur le
 * web, sur simulateur, ni dans Expo Go (SDK 53+) — il faut un development
 * build ou une build EAS. Toute erreur est absorbée : l'app continue sans push.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    debug('🔔 [Push] Non supporté sur cet environnement (web / simulateur).');
    return null;
  }

  try {
    configureNotificationHandler();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'BOLIGO',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      debug('🔔 [Push] Permission refusée.');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const pushToken = tokenResponse.data;

    await client.post('/notifications/push-token', { pushToken });
    debug('🔔 [Push] Jeton enregistré.');
    return pushToken;
  } catch (e: any) {
    debug('🔔 [Push] Enregistrement impossible :', e?.message || e);
    return null;
  }
}

export type NotificationRoute = '/(tabs)/messages' | '/(tabs)' | '/(tabs)/discover';

/** Écran à ouvrir quand l'utilisateur touche une notification. */
export function routeForNotificationData(data: Record<string, unknown> | undefined): NotificationRoute {
  switch (data?.type) {
    case 'message':
      return '/(tabs)/messages';
    case 'nouveau_match':
      return '/(tabs)/discover';
    case 'question_harmonie':
    case 'rappel_reponse':
      return '/(tabs)';
    default:
      return '/(tabs)';
  }
}

/**
 * Abonne l'app aux interactions sur les notifications. Retourne une fonction
 * de nettoyage à appeler au démontage.
 */
export function addNotificationResponseListener(onRoute: (route: NotificationRoute) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    onRoute(routeForNotificationData(data));
  });
  return () => sub.remove();
}

export async function scheduleLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch (e) {
    debug('🔔 [Push] Notification locale impossible :', e);
  }
}
