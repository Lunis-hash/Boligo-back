import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { InterviewService, Question, LAST_MODULE } from '@/services/interview';
import { getReadableError } from '@/services/api';
import { useAuth } from '@/context/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Brain, ShieldCheck, CheckCircle2, LogOut, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const MODULE_INFO: Record<number, { title: string; subtitle: string; icon: string }> = {
  0: { title: 'Filtres non-négociables', subtitle: 'Vos critères et filtres essentiels', icon: '🎯' },
  1: { title: 'Identité & Culture', subtitle: 'Origines, traditions et spiritualité', icon: '💎' },
  2: { title: 'Attachement & Régulation émotionnelle', subtitle: 'Gestion des émotions et sécurité affective', icon: '🧠' },
  3: { title: 'Vécu & Contexte', subtitle: 'Parcours de vie et enseignements', icon: '⚖️' },
  4: { title: 'Vision économique', subtitle: 'Gestion financière et organisation du foyer', icon: '💼' },
  5: { title: 'Dynamique sociale & familiale', subtitle: 'Relations familiales et entourage', icon: '🤝' },
  6: { title: 'Quotidien, Communication réelle & Limites', subtitle: 'Communication, intimité et limites', icon: '💬' },
  7: { title: 'Trajectoire de vie & Personnalité', subtitle: 'Ambitions, projets et tempérament', icon: '🌱' },
  8: { title: 'Projet de couple', subtitle: 'Engagement et vision commune du couple', icon: '💍' },
  9: { title: 'Pouvoir, Effort & Capacité à aimer', subtitle: 'Leadership, compromis et don de soi', icon: '❤️' },
  10: { title: 'Alchimie, Vibe & Désir', subtitle: 'Clef de voûte et alchimie relationnelle', icon: '✨' },
};

interface Message {
  id: string;
  text: string;
  type: 'ai' | 'user';
  options?: { key: string; text: string }[];
  questionId?: string;
}

export default function DynamicInterviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { moduleNumber } = useLocalSearchParams<{ moduleNumber: string }>();
  const parsed = parseInt((moduleNumber || '0').replace(/^module-?/i, ''), 10);
  const modNum = isNaN(parsed) ? 0 : parsed;

  const currentModuleInfo = MODULE_INFO[modNum] || { title: `Module ${modNum}`, subtitle: 'Entretien Harmonie', icon: '✨' };

  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadQuestions();
  }, [moduleNumber]);

  const goToNextStep = () => {
    if (modNum < LAST_MODULE) {
      router.replace(`/interview/${modNum + 1}` as any);
    } else {
      router.replace('/interview/generation');
    }
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await InterviewService.getQuestions(modNum);
      setQuestions(data);
      setMessages([]);
      setCurrentQuestionIndex(0);
      setAnswers({});

      if (data.length > 0) {
        const firstQ = data[0];
        addAIMessage(firstQ.text, firstQ.options, firstQ.id);
      } else {
        // Aucune question applicable (déjà répondues, filtres d'âge/genre…) :
        // on enregistre le module tel quel et on passe au suivant.
        await InterviewService.saveModule(modNum, {});
        goToNextStep();
        return;
      }
    } catch (error) {
      Alert.alert('Erreur', getReadableError(error, 'Impossible de charger les questions de ce module.'), [
        { text: 'Réessayer', onPress: () => loadQuestions() },
        { text: 'Annuler', style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addAIMessage = (text: string, options?: { key: string; text: string }[], questionId?: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      text,
      type: 'ai',
      options,
      questionId,
    };
    setMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      text,
      type: 'user',
    };
    setMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const handleAnswer = async (optionKey: string, optionText: string) => {
    if (isAnswering) return;
    setIsAnswering(true);
    
    const currentQ = questions[currentQuestionIndex];
    addUserMessage(optionText);
    
    const newAnswers = { ...answers, [currentQ.id]: optionKey };
    setAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;
    const progress = questions.length > 0 ? (nextIndex / questions.length) : 1;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
    
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setTimeout(() => {
        const nextQ = questions[nextIndex];
        addAIMessage(nextQ.text, nextQ.options, nextQ.id);
        setIsAnswering(false);
      }, 700);
    } else {
      handleModuleComplete(newAnswers);
    }
  };

  const handleModuleComplete = async (finalAnswers: Record<string, string>) => {
    setIsSaving(true);
    try {
      await InterviewService.saveModule(modNum, finalAnswers);

      if (modNum < LAST_MODULE) {
        setTimeout(() => {
          addAIMessage('✨ Excellent ! Vos réponses sont enregistrées. Passons au module suivant...');
          setTimeout(() => goToNextStep(), 1400);
        }, 800);
      } else {
        goToNextStep();
      }
    } catch (error) {
      Alert.alert(
        'Sauvegarde impossible',
        `${getReadableError(error, 'La connexion avec le serveur a été interrompue.')}\nVoulez-vous réessayer la sauvegarde ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setIsAnswering(false) },
          { text: 'Réessayer', onPress: () => handleModuleComplete(finalAnswers) },
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = () => {
    Alert.alert(
      'Faire une pause ?',
      'Votre progression est automatiquement sauvegardée. L\'entretien est obligatoire pour accéder aux profils et découvrir vos matchs compatibles.',
      [
        { text: 'Continuer l\'entretien', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFC" />
        <View style={styles.loadingOrbWrapper}>
          <LinearGradient
            colors={[Colors.primary.purple, Colors.primary.red, Colors.primary.orange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loadingOrb}
          >
            <Brain size={36} color={Colors.neutral.white} />
          </LinearGradient>
        </View>

        <View style={styles.loadingBadge}>
          <Sparkles size={12} color={Colors.primary.red} />
          <Text style={styles.loadingBadgeText}>MODULE {modNum} / 10 · {currentModuleInfo.icon}</Text>
        </View>

        <Text style={styles.loadingTitle}>{currentModuleInfo.title}</Text>
        <Text style={styles.loadingSubtitle}>{currentModuleInfo.subtitle}</Text>

        <View style={styles.loadingStatusRow}>
          <ActivityIndicator size="small" color={Colors.primary.red} />
          <Text style={styles.loadingStatusText}>Chargement des questions par l'IA...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
      
      {/* ── En-tête d'accompagnement ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.moduleBadge}>
            <Text style={styles.moduleBadgeIcon}>{currentModuleInfo.icon}</Text>
            <Text style={styles.moduleBadgeText}>MODULE {modNum} / 10</Text>
          </View>
          
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={handlePause}
            activeOpacity={0.7}
          >
            <LogOut size={16} color={Colors.text.primary70} />
            <Text style={styles.pauseBtnText}>Pause</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerModuleTitle}>{currentModuleInfo.title}</Text>
            <Text style={styles.headerModuleSub}>{currentModuleInfo.subtitle}</Text>
          </View>
          <Text style={styles.questionCounterText}>
            Question {currentQuestionIndex + 1}/{questions.length || 4}
          </Text>
        </View>

        {/* Barre de progression avec dégradé */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['15%', '100%'],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {messages.map((message, index) => (
          <View key={message.id} style={styles.messageWrapper}>
            {message.type === 'ai' ? (
              <View style={styles.aiBubbleContainer}>
                <LinearGradient
                  colors={[Colors.primary.red, Colors.primary.purple]}
                  style={styles.aiAvatarCircle}
                >
                  <Sparkles size={14} color="#FFF" />
                </LinearGradient>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiText}>{message.text}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{message.text}</Text>
              </View>
            )}

            {message.options && index === messages.length - 1 && !isSaving && (
              <View style={styles.optionsContainer}>
                {message.options.map((option, optIdx) => {
                  const letters = ['A', 'B', 'C', 'D', 'E'];
                  const letter = letters[optIdx] || '•';
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={styles.optionButton}
                      onPress={() => handleAnswer(option.key, option.text)}
                      activeOpacity={0.75}
                      disabled={isAnswering}>
                      <View style={styles.optionLetterCircle}>
                        <Text style={styles.optionLetterText}>{letter}</Text>
                      </View>
                      <Text style={styles.optionText}>{option.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {isSaving && (
          <View style={styles.savingCard}>
            <View style={styles.savingIconBadge}>
              <CheckCircle2 size={18} color={Colors.primary.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savingTitle}>Enregistrement de vos réponses...</Text>
              <Text style={styles.savingSub}>Mise à jour de votre Carte Mentale Harmonie</Text>
            </View>
            <ActivityIndicator size="small" color={Colors.primary.red} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#F8F9FC',
  },
  loadingOrbWrapper: {
    marginBottom: Spacing.lg,
  },
  loadingOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.red + '12',
    borderColor: Colors.primary.red + '30',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    marginBottom: Spacing.md,
  },
  loadingBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
    letterSpacing: 0.5,
  },
  loadingTitle: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary70,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: Spacing.xl,
  },
  loadingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  loadingStatusText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary70,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border + '60',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  moduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.red + '10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  moduleBadgeIcon: {
    fontSize: 12,
  },
  moduleBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
    letterSpacing: 0.5,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.backgroundLight,
  },
  pauseBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary70,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerModuleTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
  },
  headerModuleSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary70,
    marginTop: 1,
  },
  questionCounterText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
  },
  progressBarContainer: {
    width: '100%',
    height: 5,
    backgroundColor: Colors.neutral.border + '40',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
  },
  messageWrapper: {
    marginBottom: Spacing.lg,
  },
  aiBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '92%',
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  aiAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.neutral.border + '60',
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  aiText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary100,
    lineHeight: 22,
  },
  userBubble: {
    backgroundColor: Colors.primary.red,
    borderRadius: BorderRadius.lg,
    borderBottomRightRadius: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    maxWidth: '85%',
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  userText: {
    fontSize: 14,
    color: Colors.neutral.white,
    fontFamily: Typography.fontFamily.medium,
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: 'column',
    gap: 10,
    marginTop: Spacing.sm,
    paddingLeft: 36,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  optionLetterCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary.red + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary100,
    lineHeight: 20,
  },
  savingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.neutral.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary.red + '30',
    marginTop: Spacing.md,
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  savingIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary.red + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
  },
  savingSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary70,
    marginTop: 1,
  },
});
