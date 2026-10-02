import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { getReadableError } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { InterviewService, getResumeModule } from '@/services/interview';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#FFFFFF',
  red: '#E8403A',
  redDark: '#C42E29',
  orange: '#E8834A',
  purple: '#7C5CE8',
  gold: '#C89A2E',
  teal: '#0F9A90',
  green: '#1E9E5A',
  ink: '#14100E',
  ink2: '#5C534C',
  ink3: '#918780',
};

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 28, 52);
  const bottomPadding = Math.max(insets.bottom + 28, 44);

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

  // Animation de fond
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading, retryCount]);

  // Si l'utilisateur est déjà connecté ou en cours d'authentification, afficher un écran de transition fluide
  if (authLoading || token) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.pillBadgeRed}>
          <Text style={styles.pillBadgeRedText}>RENCONTRES SÉRIEUSES</Text>
        </View>
        <Text style={[styles.splashLogo, { marginTop: 16, marginBottom: 6 }]}>BOLIGO</Text>
        <Text style={[styles.splashSub, { marginBottom: 32 }]}>Ton BOLIGO, c'est la bonne personne</Text>
        {resumeError ? (
          <View style={{ alignItems: 'center', gap: 14, paddingHorizontal: 12 }}>
            <Text style={styles.resumeErrorText}>{resumeError}</Text>
            <TouchableOpacity onPress={() => setRetryCount((c) => c + 1)} activeOpacity={0.85} style={styles.ctaWrapper} testID="resume-retry">
              <LinearGradient colors={[COLORS.red, COLORS.orange]} style={styles.ctaButton}>
                <Text style={styles.ctaText}>Réessayer</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => signOut()} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 24 }}>
            <ActivityIndicator size="small" color={COLORS.red} />
            {slowServer && (
              <Text style={styles.resumeHintText} testID="resume-slow-hint">
                Le serveur se réveille, cela peut prendre jusqu'à une minute…
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding, paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Badge haut */}
          <View style={styles.pillBadgeRed}>
            <Text style={styles.pillBadgeRedText}>RENCONTRES SÉRIEUSES</Text>
          </View>

          {/* Logo principal */}
          <Text style={styles.splashLogo}>BOLIGO</Text>
          <Text style={styles.splashSub}>Ton BOLIGO, c'est la bonne personne</Text>

          {/* Avatar nodes overlapping */}
          <View style={styles.avatarRow}>
            <LinearGradient
              colors={['#8B6FE8', '#5B21B6']}
              style={[styles.avatarCircle, { marginRight: -18, zIndex: 2 }]}
            >
              <Ionicons name="person" size={36} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
            <LinearGradient
              colors={[COLORS.orange, COLORS.red]}
              style={styles.avatarCircle}
            >
              <Ionicons name="person" size={36} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </View>

          {/* Titre & sous-titre */}
          <Text style={styles.splashTitle}>
            Pas de photos.{'\n'}
            <Text style={styles.italicText}>Des questions pour vraiment se découvrir.</Text>
          </Text>

          <Text style={styles.splashHeroBold}>
            L'IA vous connecte à ceux qui vous ressemblent.
          </Text>

          {/* Timeline du parcours en 5 étapes */}
          <View style={styles.journeyBox}>
            <View style={styles.journeyRow}>
              <View style={[styles.jDot, { backgroundColor: COLORS.purple }]} />
              <Text style={styles.jText}>
                <Text style={styles.jBold}>40 questions</Text> pour ton profil
              </Text>
            </View>
            <View style={styles.journeyRow}>
              <View style={[styles.jDot, { backgroundColor: COLORS.red }]} />
              <Text style={styles.jText}>
                Des profils <Text style={styles.jBold}>compatibles à 80 %</Text>
              </Text>
            </View>
            <View style={styles.journeyRow}>
              <View style={[styles.jDot, { backgroundColor: COLORS.gold }]} />
              <Text style={styles.jText}>
                <Text style={styles.jBold}>3 jours</Text> de questions guidées par l'IA
              </Text>
            </View>
            <View style={styles.journeyRow}>
              <View style={[styles.jDot, { backgroundColor: COLORS.teal }]} />
              <Text style={styles.jText}>
                <Text style={styles.jBold}>3 jours</Text> d'échanges libres
              </Text>
            </View>
            <View style={styles.journeyRow}>
              <View style={[styles.jDot, { backgroundColor: COLORS.green }]} />
              <Text style={styles.jText}>
                <Text style={styles.jBold}>7 minutes</Text> de vidéo, puis vos contacts
              </Text>
            </View>
          </View>

          {/* Bouton principal CTA */}
          <TouchableOpacity
            onPress={() => router.push('/onboarding/value-slides')}
            activeOpacity={0.88}
            style={styles.ctaWrapper}
          >
            <LinearGradient
              colors={[COLORS.red, COLORS.orange]}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Trouver mon BOLIGO →</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Reassurance */}
          <View style={styles.reassureRow}>
            <Text style={styles.reassureBold}>Inscription gratuite</Text>
            <Text style={styles.dotSep}>●</Text>
            <Text style={styles.reassureText}>Profils vérifiés</Text>
          </View>

          {/* Lien vers connexion */}
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>J'ai déjà un compte</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── STYLES DU PROJET MOBILE ──────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pillBadgeRed: {
    borderWidth: 1.5,
    borderColor: 'rgba(232,64,58,0.35)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 5,
    marginBottom: 18,
  },
  pillBadgeRedText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9.5,
    color: COLORS.red,
    letterSpacing: 2.6,
  },
  splashLogo: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 58,
    color: COLORS.red,
    letterSpacing: 4,
    lineHeight: 60,
  },
  splashSub: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: COLORS.ink3,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 26,
    color: COLORS.ink,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  italicText: {
    fontStyle: 'italic',
    color: COLORS.ink2,
  },
  splashHeroBold: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 20,
  },
  journeyBox: {
    width: '100%',
    backgroundColor: 'rgba(20,16,14,0.025)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 24,
    gap: 8,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  jText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: COLORS.ink2,
  },
  jBold: {
    fontFamily: Typography.fontFamily.bold,
    color: COLORS.ink,
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  ctaButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#FFF',
  },
  reassureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  reassureBold: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: COLORS.ink2,
  },
  dotSep: {
    fontSize: 5,
    color: '#D6CFC8',
  },
  reassureText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: COLORS.ink3,
  },
  loginLink: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: COLORS.red,
    textDecorationLine: 'underline',
    marginTop: 12,
  },
  resumeHintText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: 'rgba(20,16,14,0.55)',
  },
  resumeErrorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: COLORS.ink2,
    textAlign: 'center',
    lineHeight: 19,
  },
});