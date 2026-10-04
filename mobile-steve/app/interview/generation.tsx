import { View, Text, StyleSheet, ActivityIndicator, Animated, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { InterviewService, getResumeModule } from '@/services/interview';
import { getReadableError } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Sparkles, CheckCircle2 } from 'lucide-react-native';

export default function GenerationScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('Analyse de vos réponses...');
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    generateProfile();
  }, []);

  const generateProfile = async () => {
    setHasError(false);
    try {
      // Étape 1 : Analyse
      setStatus('Cartographie de votre personnalité...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 2 : complétion côté backend (génère la carte mentale IA)
      setStatus('Rédaction de votre fiche BOLIGO…');
      const current = await InterviewService.getStatus();
      if (!current.isCompleted) {
        const result = await InterviewService.completeInterview();
        if (result?.allModulesCompleted === false) {
          // Des questions restent à poser (ex. module 0 : seule la réponse
          // d'inscription y figurait) : on y retourne au lieu d'un bilan incomplet.
          const status = await InterviewService.getStatus();
          router.replace(`/interview/${getResumeModule(status)}` as any);
          return;
        }
      }

      // Étape 3 : Finalisation
      setStatus('Finalisation de votre profil...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsDone(true);
      setStatus('Votre profil est prêt !');
      
      setTimeout(() => {
        router.replace('/interview/summary');
      }, 1800);
    } catch (error) {
      setHasError(true);
      setStatus(getReadableError(error, 'Oups, une erreur est survenue.'));
    }
  };

  return (
    <LinearGradient
      colors={[Colors.neutral.white, Colors.primary.red + '05', Colors.primary.purple + '05']}
      style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[Colors.primary.red, Colors.primary.purple]}
            style={styles.iconCircle}>
            {isDone ? (
              <CheckCircle2 color="white" size={40} />
            ) : (
              <Brain color="white" size={40} />
            )}
          </LinearGradient>
          {!isDone && (
            <Animated.View style={styles.sparkleContainer}>
              <Sparkles color={Colors.primary.orange} size={24} />
            </Animated.View>
          )}
        </View>

        <Text style={styles.title}>
          {isDone ? 'C\'est prêt !' : 'BOLIGO prépare votre fiche…'}
        </Text>
        
        <Text style={styles.subtitle}>
          Notre IA analyse vos nuances pour vous proposer les meilleures connexions.
        </Text>

        <View style={styles.statusBox}>
          {!isDone && !hasError && <ActivityIndicator color={Colors.primary.red} style={{ marginBottom: 10 }} />}
          <Text style={styles.statusText}>{status}</Text>
          {hasError && (
            <TouchableOpacity onPress={generateProfile} style={styles.retryBtn} activeOpacity={0.8} testID="generation-retry">
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: Spacing.xxl,
    position: 'relative',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.fontFamily.serif,
    color: Colors.text.primary100,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary70,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  statusBox: {
    backgroundColor: Colors.neutral.white,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral.border + '40',
    alignItems: 'center',
    width: '100%',
    elevation: 2,
  },
  statusText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary100,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.red,
  },
  retryText: {
    color: Colors.neutral.white,
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
  },
});
