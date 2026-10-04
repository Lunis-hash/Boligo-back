import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getReadableError } from '@/services/api';
import { useAuth } from '@/context/auth';
import { InterviewService, getResumeModule } from '@/services/interview';
import { Brand } from '@/constants/brand';
import { useBrandFonts } from '@/services/brandFonts';
import { LandingPage } from '@/components/landing/LandingPage';

import { Typography } from '@/constants/theme';
export default function WelcomeScreen() {
  const router = useRouter();
  const { font } = useBrandFonts();

  const { token, isLoading: authLoading, signOut } = useAuth();
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // Instance gratuite Render : le premier appel peut attendre le réveil du serveur.
  const [slowServer, setSlowServer] = useState(false);

  useEffect(() => {
    if (authLoading || !token) return;
    setSlowServer(false);
    const timer = setTimeout(() => setSlowServer(true), 4000);
    return () => clearTimeout(timer);
  }, [authLoading, token, retryCount]);

  useEffect(() => {
    let isMounted = true;
    const checkUserNavigation = async () => {
      if (!authLoading && token) {
        setResumeError(null);
        try {
          const status = await InterviewService.getStatus();
          if (isMounted) {
            if (status.isCompleted) {
              router.replace('/(tabs)/discover');
            } else {
              router.replace(`/interview/${getResumeModule(status)}` as any);
            }
          }
        } catch (e) {
          // Session invalide → l'intercepteur API a déjà déconnecté l'utilisateur.
          // Autre erreur (réseau, serveur) → on propose de réessayer plutôt que
          // d'envoyer l'utilisateur au début de l'entretien.
          if (isMounted) setResumeError(getReadableError(e, 'Impossible de charger votre session.'));
        }
      }
    };

    checkUserNavigation();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading, retryCount]);

  // Si l'utilisateur est déjà connecté ou en cours d'authentification, afficher un écran de transition fluide
  if (authLoading || token) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.fond} />
        <Text style={[styles.splashLogo, { fontFamily: font('titreGras') }]}>BOLIGO</Text>
        <Text style={[styles.splashSub, { fontFamily: font('texteMoyen') }]}>Votre BOLIGO, c’est la bonne personne</Text>
        {resumeError ? (
          <View style={{ alignItems: 'center', gap: 14, paddingHorizontal: 12 }}>
            <Text style={[styles.resumeErrorText, { fontFamily: font('texte') }]}>{resumeError}</Text>
            <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)} activeOpacity={0.85} style={styles.ctaButton} testID="resume-retry">
              <Text style={[styles.ctaText, { fontFamily: font('texteGras') }]}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => signOut()} activeOpacity={0.7}>
              <Text style={[styles.loginLink, { fontFamily: font('texteDemi') }]}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 24 }}>
            <ActivityIndicator size="small" color={Brand.framboise} />
            {slowServer && (
              <Text style={[styles.resumeHintText, { fontFamily: font('texte') }]} testID="resume-slow-hint">
                Le serveur se réveille, cela peut prendre jusqu'à une minute…
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return <LandingPage />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.fond,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  splashLogo: {
    fontFamily: Typography.fontFamily.regular, fontSize: 52,
    color: Brand.framboise,
    letterSpacing: 3,
  },
  splashSub: {
    fontFamily: Typography.fontFamily.regular, fontSize: 15,
    color: Brand.encreDouce,
    marginTop: 6,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: Brand.framboise,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Typography.fontFamily.regular, fontSize: 16,
    color: '#FFFFFF',
  },
  loginLink: {
    fontFamily: Typography.fontFamily.regular, fontSize: 14,
    color: Brand.framboise,
    textDecorationLine: 'underline',
  },
  resumeHintText: {
    fontFamily: Typography.fontFamily.regular, fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Brand.encreDouce,
  },
  resumeErrorText: {
    fontFamily: Typography.fontFamily.regular, fontSize: 15,
    color: Brand.encreDouce,
    textAlign: 'center',
    lineHeight: 22,
  },
});
