import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StripeProvider } from '@/services/stripe';
import { addNotificationResponseListener, configureNotificationHandler } from '@/services/notifications';
import { installWebAlert } from '@/services/webAlert';
import { warmUpBackend } from '@/services/api';

installWebAlert();

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

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <StripeProvider publishableKey={publishableKey}>
        <AuthProvider>
          <AppProvider>
          <NotificationRouter />
          <BackendWarmUp />
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
            <Stack.Screen name="video-call" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AppProvider>
        </AuthProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
}
