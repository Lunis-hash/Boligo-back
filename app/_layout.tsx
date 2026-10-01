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

const publishableKey = 
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51Tsn1y1n8AkKHpjmTxILfV3IUz9gohe14j4J5lDTLxie03bWa5mEY3dLJ2daF7GlifDjQwvKogZYhCIMYk3Y31FF00cS5Fv7ve';

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
            <Stack.Screen name="video-call" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AppProvider>
        </AuthProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
}
