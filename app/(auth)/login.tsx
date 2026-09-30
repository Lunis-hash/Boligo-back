import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AuthService } from '@/services/auth';
import { getReadableError } from '@/services/api';
import { InterviewService, getResumeModule } from '@/services/interview';
import { useAuth } from '@/context/auth';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Photos de fond ────────────────────────────────────────────────
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80',
];

// ─── Particules décoratives ────────────────────────────────────────
const PARTICLES = [
  { size: 6,  top: '10%', left: '10%',  color: Colors.primary.red,    opacity: 0.5, duration: 7000  },
  { size: 8,  top: '17%', right: '8%',  color: Colors.primary.purple, opacity: 0.45, duration: 9000 },
  { size: 5,  top: '76%', left: '8%',   color: Colors.primary.orange, opacity: 0.4, duration: 8000  },
  { size: 7,  top: '80%', right: '10%', color: Colors.primary.red,    opacity: 0.35, duration: 11000},
];

function Particle({ size, top, left, right, color, opacity, duration }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: duration / 2, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: size / 2,
        top, left, right,
        backgroundColor: color,
        opacity,
        transform: [{
          translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }),
        }],
      }}
    />
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  // Animations d'entrée
  const topAnim = useRef(new Animated.Value(0)).current;
  const topSlide = useRef(new Animated.Value(22)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardSlide = useRef(new Animated.Value(16)).current;
  const imgFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Préchargement images
    BG_IMAGES.forEach(url => Image.prefetch(url));

    // Animation d'entrée
    Animated.parallel([
      Animated.timing(topAnim, {
        toValue: 1, duration: 800,
        delay: 150, useNativeDriver: true,
      }),
      Animated.spring(topSlide, {
        toValue: 0, friction: 8, tension: 50,
        delay: 150, useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1, duration: 900,
        delay: 400, useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1, friction: 7, tension: 50,
        delay: 400, useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0, friction: 8, tension: 55,
        delay: 400, useNativeDriver: true,
      }),
    ]).start();

    // Rotation images de fond
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(imgFade, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(imgFade, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ]).start();
      setCurrentImage(prev => (prev + 1) % BG_IMAGES.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.login(email.trim(), password);

      // Si le compte n'est pas encore vérifié par OTP
      if (result.isVerified === false || (!result.access_token && result.email)) {
        Alert.alert(
          'Vérification requise',
          'Votre compte n\'a pas encore été validé. Un code de confirmation à 4 chiffres vous a été envoyé par e-mail.',
          [
            {
              text: 'Saisir le code →',
              onPress: () =>
                router.push({
                  pathname: '/(auth)/verify',
                  params: { email: (result.email || email).trim() },
                }),
            },
          ]
        );
        return;
      }

      await signIn(result.access_token, result.userId, result.refresh_token);
      
      try {
        const status = await InterviewService.getStatus();
        if (status.isCompleted) {
          router.replace('/(tabs)/discover');
        } else {
          router.replace(`/interview/${getResumeModule(status)}` as any);
        }
      } catch {
        // L'écran d'accueil reprend la main et proposera de réessayer.
        router.replace('/');
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const readableMessage =
        status === 401
          ? 'Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants.'
          : getReadableError(error, 'Connexion impossible pour le moment.');
      Alert.alert('Connexion impossible', readableMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Photo flouée en fond */}
      <Animated.Image
        source={{ uri: BG_IMAGES[currentImage] }}
        style={[styles.bgImage, { opacity: imgFade }]}
        blurRadius={18}
        resizeMode="cover"
      />

      {/* Overlay sombre */}
      <View style={styles.overlay} />

      {/* Particules */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Floating Back Button */}
      <TouchableOpacity
        style={[styles.floatingBackBtn, { top: insets.top + 8 }]}
        onPress={() => router.replace('/')}
        activeOpacity={0.75}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ChevronLeft size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Contenu centré */}
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo + badge en haut */}
          <Animated.View
            style={[
              styles.topSection,
              {
                opacity: topAnim,
                transform: [{ translateY: topSlide }],
              },
            ]}
          >
            <View style={styles.badgeTop}>
              <Text style={styles.badgeTopText}>Dating sérieux</Text>
            </View>

            <Text style={styles.logo}>BOLIGO</Text>

            <Text style={styles.taglineHeader}>
              Des connexions qui ont du sens.
            </Text>
          </Animated.View>

          {/* Card premium centrale */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardAnim,
                transform: [
                  { scale: cardScale },
                  { translateY: cardSlide },
                ],
              },
            ]}
          >
            {/* Ligne dégradé décorative */}
            <LinearGradient
              colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardTopLine}
            />

            {/* Titre */}
            <Text style={styles.cardTitle}>
              Bon retour parmi{'\n'}
              <Text style={styles.cardTitleItalic}>nous</Text>
            </Text>

            {/* Formulaire */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, focusedInput === 'email' && styles.inputFocused]}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.text.primary40}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1, paddingRight: 40 }, focusedInput === 'password' && styles.inputFocused]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.text.primary40}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={{ position: 'absolute', right: 12, padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.text.primary70} />
                  ) : (
                    <Eye size={20} color={Colors.text.primary70} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Mot de passe oublié */}
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: email.trim() ? { email: email.trim() } : {} })}
              style={styles.forgotPasswordContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton principal */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.85}
              style={styles.btnWrapper}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.btn, { flexDirection: 'row', gap: Spacing.sm }]}
              >
                {isLoading && <ActivityIndicator color={Colors.neutral.white} />}
                <Text style={[styles.btnText, isLoading && { opacity: 0.9 }]}>
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.sepLine} />
              <Text style={styles.sepText}>pas encore membre ?</Text>
              <View style={styles.sepLine} />
            </View>

            {/* Lien inscription */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Nouveau ici — </Text>
              <TouchableOpacity
                onPress={() => router.push('/onboarding/profile-details')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLink}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },

  // Fond flouté
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    transform: [{ scale: 1.15 }],
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  floatingBackBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Layout principal
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    gap: Spacing.xl,
  },

  // Section logo
  topSection: {
    alignItems: 'center',
  },
  badgeTop: {
    backgroundColor: 'rgba(233,64,87,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(233,64,87,0.35)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  badgeTopText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  logo: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 44,
    color: Colors.primary.red,
    letterSpacing: 3,
  },
  taglineHeader: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
    letterSpacing: 0.3,
  },

  // Card premium
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(233,64,87,0.12)',
    shadowColor: Colors.neutral.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  cardTopLine: {
    height: 3,
    width: 60,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.h3.fontSize,
    lineHeight: Typography.h3.lineHeight,
    color: Colors.text.primary100,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  cardTitleItalic: {
    fontFamily: Typography.fontFamily.serif,
    fontStyle: 'italic',
    fontSize: 22,
    color: Colors.primary.red,
  },

  // Inputs
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.label.fontSize,
    color: Colors.text.primary100,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary100,
    backgroundColor: Colors.neutral.backgroundLight,
  },
  inputFocused: {
    borderColor: Colors.primary.red,
    backgroundColor: Colors.neutral.white,
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Bouton
  btnWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  btn: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  btnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.labelLarge.fontSize,
    color: Colors.neutral.white,
    letterSpacing: 0.2,
  },

  // Séparateur
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  sepText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.text.primary40,
  },


  // Inscription
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.label.fontSize,
    color: Colors.text.primary40,
  },
  signupLink: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.label.fontSize,
    color: Colors.primary.red,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.primary.red,
  },

  // Mot de passe oublié
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  forgotPasswordText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.primary.red,
  },
});
