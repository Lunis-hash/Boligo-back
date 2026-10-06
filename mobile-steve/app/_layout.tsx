import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter } from 'expo-router';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StripeProvider } from '@/services/stripe';
import { addNotificationResponseListener, configureNotificationHandler } from '@/services/notifications';
import { installWebAlert } from '@/services/webAlert';
import { installWebStyles } from '@/services/webStyles';
import { warmUpBackend } from '@/services/api';
import { useBrandFonts } from '@/services/brandFonts';
import { DesktopShell } from '@/components/DesktopShell';
import { WebAlertHost } from '@/components/WebAlertHost';

installWebAlert();
installWebStyles();
// L'écran de démarrage reste affiché jusqu'au chargement des polices.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Ouvre l'écran pertinent quand l'utilisateur touche une notification. */
function NotificationRouter() {
  const router = useRouter();
  useEffect(() => {
    configureNotificationHandler();
    return addNotificationResponseListener((route) => router.push(route as any));
  }, [router]);
  return null;
}

/** Réveille le backend dès l'ouverture de l'app (cold start des instances gratuites). */
function BackendWarmUp() {
  useEffect(() => {
    warmUpBackend();
  }, []);
  return null;
}

// Clé publique Stripe fournie au build (eas.json / variables d'environnement).
// La clé de test de secours ne sert qu'en développement : une build sans clé
// n'utilise jamais silencieusement une clé d'un autre mode.
const publishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  (__DEV__ ? 'pk_test_51UMQWmLz8rnS1CBn3uNlIdylaIYPh5hlpznGOR8x9uJBZOhr4KGvIqHkblsi5uwoJ7K6WD4HJMTENfTtL0kN6b5a002jZ8dVZD' : '');

/** Polices prêtes, ou délai dépassé (on affiche alors avec la police du système). */
function useFontsGate() {
  const { ready } = useBrandFonts();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  const open = ready || timedOut;
  useEffect(() => {
    if (open) SplashScreen.hideAsync().catch(() => undefined);
  }, [open]);
  return open;
}

export default function RootLayout() {
  const fontsOpen = useFontsGate();
  if (!fontsOpen) return null;
  return (
    <ErrorBoundary>
      <StripeProvider publishableKey={publishableKey}>
        <AuthProvider>
          <AppProvider>
          <NotificationRouter />
          <BackendWarmUp />
          <DesktopShell>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="interview" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="legal" options={{ headerShown: false }} />
            <Stack.Screen name="partenaires" options={{ headerShown: false }} />
            <Stack.Screen name="partners" options={{ headerShown: false }} />
            <Stack.Screen name="video-call" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          </DesktopShell>
          <WebAlertHost />
        </AppProvider>
        </AuthProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
}
