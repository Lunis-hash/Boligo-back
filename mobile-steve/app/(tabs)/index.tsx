import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  StatusBar,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  AppState,
} from 'react-native';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/auth';
import client, { getReadableError } from '@/services/api';
import { clampDay, getSondeurDayState, getSondeurDayStatus, getSondeurLockedLabel } from '@/services/sondeur';
import cacheService from '@/services/cacheService';
import soundService from '@/services/soundService';
import {
  Heart,
  Check,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Lock,
} from 'lucide-react-native';

// ─── Thèmes par défaut des 3 jours (affichage uniquement) ──────────
// Les questions réelles sont générées par le backend (GET /journey/:id/questions).
const SONDEUR_DAYS = [
  { day: 1, theme: 'Lignes rouges', emoji: '🚩' },
  { day: 2, theme: 'Valeurs profondes', emoji: '⚖️' },
  { day: 3, theme: 'Futur & Sacrifices', emoji: '🔮' },
];

// ─── Composant étape jour ──────────────────────────────────────────
function DayStep({
  day,
  status,
  theme,
  emoji,
  isLast,
  onPressActive,
  lockedLabel,
}: {
  day: number;
  status: 'done' | 'active' | 'locked';
  theme: string;
  emoji: string;
  isLast: boolean;
  onPressActive?: () => void;
  lockedLabel?: string;
}) {
  const content = (
    <View style={styles.dayStepWrap}>
      <View style={styles.dayStepLeft}>
        {status === 'done' ? (
          <LinearGradient
            colors={[Colors.primary.red, Colors.primary.purple]}
            style={styles.dayCircle}
          >
            <Check size={14} color="#fff" strokeWidth={3} />
          </LinearGradient>
        ) : status === 'active' ? (
          <LinearGradient
            colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayCircle}
          >
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.dayCircle, styles.dayCircleLocked]}>
            <Lock size={14} color={Colors.text.primary40} />
          </View>
        )}
        {!isLast && (
          <View
            style={[
              styles.dayConnector,
              {
                backgroundColor:
                  status === 'done'
                    ? Colors.primary.red + '40'
                    : Colors.neutral.border,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.dayStepInfo}>
        <Text
          style={[
            styles.dayStepLabel,
            status === 'active' && styles.dayStepLabelActive,
            status === 'done' && styles.dayStepLabelDone,
            status === 'locked' && styles.dayStepLabelLocked,
          ]}
        >
          Jour {day}
        </Text>
        <View style={styles.dayThemePill}>
          <Text
            style={[
              styles.dayThemeText,
              status === 'locked' && { color: Colors.text.primary40 },
            ]}
          >
            {emoji}  {theme}
          </Text>
        </View>
        {status === 'done' && <Text style={styles.dayDoneLabel}>Réponses comparées ✓</Text>}
        {status === 'active' && <Text style={styles.dayActiveLabel}>En cours — 2 questions</Text>}
        {status === 'locked' && <Text style={styles.dayLockedLabel}>{lockedLabel ?? 'Disponible après le jour précédent'}</Text>}
      </View>
    </View>
  );

  if (status === 'active' && onPressActive) {
    return (
      <TouchableOpacity onPress={onPressActive} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ─── Écran principal ───────────────────────────────────────────────
function pickActiveMatch(allMatches: any[]) {
  // Un parcours terminé ne s'affiche plus ici (il reste consultable dans Messages).
  const matches = allMatches.filter((m) => !m.ended);
  if (!matches.length) return undefined;
  const withJourney = matches.find(
    (m) => m.journeyId && m.phase !== 'attente',
  );
  if (withJourney) return withJourney;
  const sondeur = matches.find((m) => m.phase === 'sondeur' || m.phase === 'harmonie');
  if (sondeur) return sondeur;
  return matches.find((m) => m.phase !== 'attente') ?? matches[0];
}

export default function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    (insets.top || StatusBar.currentHeight || 0) + (Platform.OS === 'ios' ? 10 : 16),
    Platform.OS === 'ios' ? 56 : 48
  );
  const bottomPadding = Math.max(insets.bottom + 20, 32);

  const { credits, matches, loadMatches } = useAppContext();
  const firstMatch = useMemo(() => pickActiveMatch(matches), [matches]);
  const { userId } = useAuth();

  // State lié au journey backend
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentDay, setCurrentDay] = useState(1);
  // Jour calendaire du parcours (1..3) fourni par GET /journey/:id/status.
  const [calendarDay, setCalendarDay] = useState(1);
  const [answeredDays, setAnsweredDays] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'overview' | 'question'>('overview');
  const [qIndex, setQIndex] = useState(0);
  const [customText, setCustomText] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [partnerAnswers, setPartnerAnswers] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const ctaScale = useRef(new Animated.Value(0.92)).current;
  const ctaFade = useRef(new Animated.Value(0)).current;

  // Recharger matchs + parcours à chaque ouverture de l'onglet et au retour au
  // premier plan : les réponses du partenaire et le jour du Sondeur évoluent.
  const journeyIdRef = useRef<string | null>(null);
  const refreshAll = useCallback(() => {
    loadMatches(true);
    if (journeyIdRef.current) loadJourney(journeyIdRef.current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMatches]);
  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAll();
    });
    return () => sub.remove();
  }, [refreshAll]);

  // Appliquer les données du parcours instantanément
  const applyJourneyData = (status: any, questions: any[]) => {
    setDbQuestions(questions);
    setCalendarDay(clampDay(status?.currentDay));

    // Si le parcours est fini (chat_libre ou plus)
    if (status.currentStep !== 'phase_harmonie') {
      setAnsweredDays([1, 2, 3]);
      const myAns: Record<string, string> = {};
      const partnerAns: Record<string, string> = {};
      questions.forEach((q: any) => {
        q.responses?.forEach((r: any) => {
          if (r.userId === userId) myAns[q.id] = r.responseText;
          else partnerAns[q.id] = r.responseText;
        });
      });
      setUserAnswers(myAns);
      setPartnerAnswers(partnerAns);
      setRevealedKeys(Object.keys(partnerAns));
    } else {
      // Calculer les jours déjà répondus
      const myAns: Record<string, string> = {};
      const partnerAns: Record<string, string> = {};
      const daysAnswered = new Set<number>();

      questions.forEach((q: any) => {
        const myResponse = q.responses?.find((r: any) => r.userId === userId);
        const partnerResponse = q.responses?.find((r: any) => r.userId !== userId);
        if (myResponse) {
          myAns[q.id] = myResponse.responseText;
        }
        if (partnerResponse) {
          partnerAns[q.id] = partnerResponse.responseText;
        }
      });

      setUserAnswers(myAns);
      setPartnerAnswers(partnerAns);

      // Déterminer quels jours sont complétés
      for (let day = 1; day <= 3; day++) {
        const dayQuestions = questions.filter((q: any) => q.day === day);
        const allAnswered = dayQuestions.every((q: any) =>
          q.responses?.some((r: any) => r.userId === userId)
        );
        if (allAnswered && dayQuestions.length > 0) {
          daysAnswered.add(day);
        }
      }
      const answeredList = Array.from(daysAnswered).sort();
      setAnsweredDays(answeredList);
      setCurrentDay(getSondeurDayState(answeredList, status?.currentDay).currentDay);

      // Révéler les réponses du partenaire pour les jours déjà répondus
      setRevealedKeys(Object.keys(partnerAns));
    }
  };

  // Charger le journey depuis l'API ou le cache instantané
  useEffect(() => {
    journeyIdRef.current = firstMatch?.journeyId ?? null;
    if (firstMatch?.journeyId) {
      setJourneyId(firstMatch.journeyId);
      const cached = cacheService.peek<any>(`journey_${firstMatch.journeyId}`);
      if (cached) {
        applyJourneyData(cached.status, cached.questions);
        setLoading(false);
      }
      loadJourney(firstMatch.journeyId, !!cached);
    } else {
      setDbQuestions([]);
      setJourneyId(null);
      setLoading(false);
    }
  }, [firstMatch?.journeyId, userId]);

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animation CTA quand les 3 jours sont complétés
  useEffect(() => {
    if (answeredDays.length === 3) {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(ctaFade, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.spring(ctaScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        ]).start();
      }, 400);
    }
  }, [answeredDays]);

  const loadJourney = async (jId: string, silent = false) => {
    try {
      if (!silent && dbQuestions.length === 0) setLoading(true);
      setJourneyId(jId);

      const [statusRes, questionsRes] = await Promise.all([
        client.get(`/journey/${jId}/status`),
        client.get(`/journey/${jId}/questions`),
      ]);

      const status = statusRes.data;
      const questions = questionsRes.data;
      cacheService.set(`journey_${jId}`, { status, questions });
      applyJourneyData(status, questions);
    } catch (e) {
      console.error('Failed to load journey:', e);
    } finally {
      setLoading(false);
    }
  };

  // Thèmes du jour pour la timeline (depuis DB ou fallback local)
  const dayThemes = [1, 2, 3].map(day => {
    const dayQs = dbQuestions.filter((q: any) => q.day === day);
    if (dayQs.length > 0) {
      return { day, theme: dayQs[0].theme, emoji: dayQs[0].emoji ?? '💬' };
    }
    const local = SONDEUR_DAYS.find(d => d.day === day);
    return { day, theme: local?.theme ?? 'Question', emoji: local?.emoji ?? '💬' };
  });

  const dayDbQuestions = dbQuestions.filter((q: any) => q.day === currentDay);
  const currentDbQ = dayDbQuestions[qIndex];
  const dayData = SONDEUR_DAYS[currentDay - 1];
  const dayThemeMeta = dayThemes.find((d) => d.day === currentDay);

  // Seules les questions du backend sont proposées : une réponse à une
  // question locale ne serait jamais enregistrée ni comparée.
  const totalQuestionsToday = dayDbQuestions.length;
  const currentQ = currentDbQ
    ? {
        key: currentDbQ.id,
        question: currentDbQ.questionText,
        options: (currentDbQ.options as string[]) ?? [],
      }
    : null;

  const sondeurInProgress =
    firstMatch?.phase === 'sondeur' || firstMatch?.phase === 'harmonie';
  const allDone =
    answeredDays.length === 3 ||
    (firstMatch?.phase === 'chat' || firstMatch?.phase === 'video' || firstMatch?.phase === 'contacts');
  // Règle BOLIGO : 7 questions par jour, pendant 3 jours. Une journée ne
  // s'ouvre que si la précédente est répondue ET si le jour calendaire est atteint.
  const dayState = getSondeurDayState(answeredDays, calendarDay);
  const canAnswerToday =
    sondeurInProgress &&
    !!firstMatch?.journeyId &&
    !allDone &&
    dayState.canAnswer &&
    !answeredDays.includes(currentDay) &&
    totalQuestionsToday > 0;
  const waitingForNextDay = sondeurInProgress && !allDone && dayState.waitingForNextDay;

  const getDayStatus = (day: number): 'done' | 'active' | 'locked' =>
    getSondeurDayStatus(day, answeredDays, dayState);

  const handleAnswer = async () => {
    const answer = customText.trim();
    if (!answer || submittingAnswer) return;

    const dbQ = dayDbQuestions[qIndex];
    if (!dbQ?.id || !journeyId) {
      Alert.alert('Questions indisponibles', 'Les questions du Sondeur ne sont pas encore prêtes. Réessayez dans un instant.');
      return;
    }

    setSubmittingAnswer(true);
    soundService.playOptionSelect();

    try {
      await client.post('/journey/respond', { questionId: dbQ.id, text: answer });
    } catch (e) {
      setSubmittingAnswer(false);
      // 400 = réponse refusée par la modération BOLIGO : on garde le texte
      // pour que l'utilisateur puisse le reformuler.
      Alert.alert('Réponse non enregistrée', getReadableError(e, 'Vérifiez votre connexion et réessayez.'));
      return;
    }

    setUserAnswers(prev => ({ ...prev, [dbQ.id]: answer }));
    setSubmittingAnswer(false);

    const countToday = totalQuestionsToday;
    if (countToday === 0) return;
    // Question suivante encore sans réponse (reprise possible au milieu d'une journée).
    const nextIndex = dayDbQuestions.findIndex(
      (q: any, i: number) => i !== qIndex && q.id !== dbQ.id && !userAnswers[q.id],
    );
    if (nextIndex !== -1) {
      setTimeout(() => { setQIndex(nextIndex); setCustomText(''); }, 300);
    } else {
      setTimeout(async () => {
        soundService.playMatchCelebration();
        setAnsweredDays(prev => [...prev, currentDay]);
        setViewMode('overview');
        setQIndex(0);
        setCustomText('');
        if (currentDay < 3) setCurrentDay(d => d + 1);

        // Recharger le parcours et les matches pour mettre à jour la phase
        if (journeyId) loadJourney(journeyId, true);
        await loadMatches(true);
      }, 400);
    }
  };

  const handleReveal = (key: string) =>
    setRevealedKeys(prev => [...prev, key]);

  // ── Aller vers la messagerie (chat libre après Sondeur) ──────
  const goToMessages = () => {
    router.push('/(tabs)/messages');
  };

  // ── État vide ─────────────────────────────────────────────────────
  if (!firstMatch) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <Text style={styles.headerTitle}>Mes matchs</Text>
        </View>
        <View style={styles.emptyWrap}>
          <LinearGradient
            colors={[Colors.primary.red + '12', Colors.primary.purple + '10']}
            style={styles.emptyCircle}
          >
            <Heart size={40} color={Colors.primary.red} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Aucun match actif</Text>
          <Text style={styles.emptyDesc}>
            Connecte-toi avec un profil dans Découverte pour lancer ton premier parcours.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discover')}
            activeOpacity={0.85}
            style={styles.emptyBtnWrap}
          >
            <LinearGradient
              colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyBtn}
            >
              <Text style={styles.emptyBtnText}>Explorer des profils</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const openQuestionFlow = () => {
    if (!canAnswerToday) return;
    // Reprendre à la première question du jour sans réponse.
    const firstPending = dayDbQuestions.findIndex((q: any) => !userAnswers[q.id]);
    setQIndex(firstPending === -1 ? 0 : firstPending);
    setViewMode('question');
  };

  // ── Vue questions ─────────────────────────────────────────────────
  if (viewMode === 'question') {
    if (!currentQ) {
      return (
        <View style={[styles.container, styles.loaderWrap]}>
          <Text style={styles.emptyTitle}>Chargement des questions…</Text>
          <TouchableOpacity
            onPress={() => {
              setViewMode('overview');
              if (firstMatch?.journeyId) loadJourney(firstMatch.journeyId);
            }}
            style={styles.emptyBtnWrap}
          >
            <Text style={styles.emptyBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
        <View style={[styles.questionHeader, { paddingTop: topPadding }]}>
          <TouchableOpacity
            onPress={() => { setViewMode('overview'); setQIndex(0); }}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.questionHeaderCenter}>
            <LinearGradient
              colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.questionDayBadge}
            >
              <Text style={styles.questionDayBadgeText}>
                {dayThemeMeta?.emoji ?? dayData.emoji}  Jour {currentDay} · {dayThemeMeta?.theme ?? dayData.theme}
              </Text>
            </LinearGradient>
            <Text style={styles.questionCounter}>
              Question {qIndex + 1} / {totalQuestionsToday}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.questionScroll, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Bulle BOLIGO */}
          <View style={styles.questionBubble}>
            <View style={styles.questionBubbleHeader}>
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple]}
                style={styles.boligoAvatar}
              >
                <Sparkles size={14} color="#fff" />
              </LinearGradient>
              <Text style={styles.boligoName}>BOLIGO</Text>
            </View>
            <Text style={styles.questionText}>{currentQ?.question}</Text>
            <Text style={styles.questionHint}>
              💡 Réponds sincèrement — {firstMatch.name} répondra de son côté sans voir ta réponse.
            </Text>
          </View>

          {/* Champ de saisie libre */}
          <View style={styles.optionsWrap}>
            <TextInput
              style={[styles.customInput, { minHeight: 120, textAlignVertical: 'top', fontSize: 16 }]}
              placeholder="Écrivez votre réponse ici..."
              placeholderTextColor={Colors.text.primary40}
              value={customText}
              onChangeText={setCustomText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleAnswer}
              activeOpacity={0.8}
              style={[styles.optionBtn, styles.optionBtnSelected, { marginTop: Spacing.md, opacity: (customText.trim() && !submittingAnswer) ? 1 : 0.5, borderWidth: 0 }]}
              disabled={!customText.trim() || submittingAnswer}
            >
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.optionBtnGrad, { paddingVertical: Spacing.md, justifyContent: 'center' }]}
              >
                {submittingAnswer ? (
                  <>
                    <Text style={[styles.optionTextSelected, { fontSize: 16, textAlign: 'center', flex: 0 }]}>Analyse en cours...</Text>
                    <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />
                  </>
                ) : (
                  <>
                    <Text style={[styles.optionTextSelected, { fontSize: 16, textAlign: 'center', flex: 0 }]}>Valider la réponse</Text>
                    <Check size={18} color="#fff" strokeWidth={3} style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Vue principale overview ───────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />

      <Animated.View
        style={[
          styles.header,
          { paddingTop: topPadding },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View>
          <Text style={styles.headerTitle}>Mes matchs</Text>
          <Text style={styles.headerSub}>Parcours de découverte mutuelle</Text>
        </View>
        <TouchableOpacity
          style={styles.creditsBadge}
          onPress={() => router.push('/onboarding/payment')}
          activeOpacity={0.8}
        >
          <Heart size={13} color={Colors.primary.red} fill={Colors.primary.red} />
          <Text style={styles.creditsText}>{credits} crédits</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Carte match ─────────────────────────────────────── */}
          <View style={styles.matchCard}>
            <LinearGradient
              colors={[
                Colors.primary.red + '08',
                Colors.primary.purple + '06',
                Colors.primary.orange + '05',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matchCardGrad}
            >
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                style={styles.matchAvatar}
              >
                <Text style={styles.matchAvatarText}>
                  {firstMatch.name.charAt(0)}
                </Text>
              </LinearGradient>
              <View style={styles.matchInfo}>
                <Text style={styles.matchName}>{firstMatch.name}</Text>
                <Text style={styles.matchProfession}>{firstMatch.profession}</Text>
              </View>
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.compatBadge}
              >
                <Heart size={11} color="#fff" fill="#fff" />
                <Text style={styles.compatText}>{firstMatch.compatibility}%</Text>
              </LinearGradient>
            </LinearGradient>
          </View>

          {/* ── CONTENU PARCOURS : Masqué si en attente ─────────────── */}
          {firstMatch.phase === 'attente' ? (
            <View style={styles.waitingFullCard}>
              <LinearGradient
                colors={[Colors.primary.red + '15', Colors.primary.purple + '12']}
                style={styles.waitingIconCircle}
              >
                <Text style={{ fontSize: 44 }}>⏳</Text>
              </LinearGradient>
              <Text style={styles.waitingTitle}>Invitation envoyée</Text>
              <Text style={styles.waitingDesc}>
                Votre demande de connexion avec {firstMatch.name} est en attente de validation.
              </Text>
              <View style={styles.waitingInfoBox}>
                <Sparkles size={16} color={Colors.primary.purple} />
                <Text style={styles.waitingInfoText}>
                  Le Parcours Harmonie débutera automatiquement dès que {firstMatch.name} aura accepté.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/discover')}
                activeOpacity={0.8}
                style={styles.waitingBackBtn}
              >
                <Text style={styles.waitingBackBtnText}>Retourner à la découverte</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {loading && (
                <View style={styles.preparingCard}>
                  <ActivityIndicator color={Colors.primary.red} />
                  <Text style={styles.preparingText}>Préparation du parcours Harmonie…</Text>
                </View>
              )}

              {!loading && sondeurInProgress && !firstMatch?.journeyId && (
                <View style={styles.preparingCard}>
                  <Text style={styles.preparingText}>
                    Le parcours démarre dès que votre match est confirmé des deux côtés.
                  </Text>
                  <TouchableOpacity onPress={() => loadMatches()} style={styles.refreshLink}>
                    <Text style={styles.refreshLinkText}>Actualiser</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!loading && sondeurInProgress && firstMatch?.journeyId && dbQuestions.length === 0 && (
                <View style={styles.preparingCard}>
                  <Text style={styles.preparingText}>Génération des questions du Sondeur…</Text>
                  <TouchableOpacity
                    onPress={() => firstMatch.journeyId && loadJourney(firstMatch.journeyId)}
                    style={styles.refreshLink}
                  >
                    <Text style={styles.refreshLinkText}>Charger les questions</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Timeline 3 jours ────────────────────────────────── */}
              <View style={styles.timelineCard}>
                <Text style={styles.sectionTitle}>Parcours Harmonie — 3 jours</Text>
                <View style={styles.timeline}>
                  {dayThemes.map((d, i) => (
                    <DayStep
                      key={d.day}
                      day={d.day}
                      status={getDayStatus(d.day)}
                      theme={d.theme}
                      emoji={d.emoji}
                      isLast={i === dayThemes.length - 1}
                      onPressActive={openQuestionFlow}
                      lockedLabel={getSondeurLockedLabel(d.day, dayState)}
                    />
                  ))}
                </View>
                {waitingForNextDay && (
                  <View style={styles.nextDayNotice} testID="sondeur-next-day">
                    <Text style={styles.nextDayNoticeText}>
                      Vos 7 questions du jour sont faites. La prochaine série s'ouvre{' '}
                      {dayState.daysUntilUnlock <= 1 ? 'demain' : `dans ${dayState.daysUntilUnlock} jours`}.
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Question du jour ────────────────────────────────── */}
              {canAnswerToday && (
                <TouchableOpacity
                  onPress={openQuestionFlow}
                  activeOpacity={0.85}
                  style={styles.questionDayCard}
                >
                  <LinearGradient
                    colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.questionDayCardGrad}
                  >
                    <View style={styles.questionDayCardLeft}>
                      <Text style={styles.questionDayEmoji}>{dayThemeMeta?.emoji ?? dayData.emoji}</Text>
                      <View>
                        <Text style={styles.questionDayTitle}>Question du jour</Text>
                        <Text style={styles.questionDaySub}>
                          Jour {currentDay} · {dayThemeMeta?.theme ?? dayData.theme} · {totalQuestionsToday} question{totalQuestionsToday > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.questionDayArrow}>
                      <ChevronRight size={20} color="#fff" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* ── Réponses comparées ──────────────────────────────── */}
              {answeredDays.length > 0 && (
                <View style={styles.answersSection}>
                  <Text style={styles.sectionTitle}>Vos réponses comparées</Text>
                  {answeredDays.map(day => {
                    const dayDbQs = dbQuestions.filter((q: any) => q.day === day);
                    return (
                      <View key={day} style={styles.dayAnswersBlock}>
                        <LinearGradient
                          colors={[Colors.primary.red + '15', Colors.primary.purple + '12']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.dayAnswersHeaderGrad}
                        >
                          <Text style={styles.dayAnswersHeaderText}>
                            {dayDbQs[0]?.emoji ?? '💬'}  Jour {day} · {dayDbQs[0]?.theme ?? 'Question'}
                          </Text>
                        </LinearGradient>

                        {dayDbQs.map((q: any) => {
                          const myAns = userAnswers[q.id];
                          const matchAns = partnerAnswers[q.id];
                          const revealed = revealedKeys.includes(q.id);
                          return (
                            <View key={q.id} style={styles.compareBlock}>
                              <Text style={styles.compareQuestion}>{q.questionText}</Text>
                              {/* Ma réponse */}
                              <View style={styles.compareRow}>
                                <View style={styles.compareAvatarSelf}>
                                  <Text style={styles.compareAvatarText}>Moi</Text>
                                </View>
                                <View style={styles.compareAnswerSelf}>
                                  <Text style={styles.compareAnswerText}>{myAns || '—'}</Text>
                                </View>
                              </View>
                              {/* Réponse match */}
                              <View style={styles.compareRow}>
                                <LinearGradient
                                  colors={[Colors.primary.red + '20', Colors.primary.purple + '20']}
                                  style={styles.compareAvatarMatch}
                                >
                                  <Text style={[styles.compareAvatarText, { color: Colors.primary.red }]}>
                                    {firstMatch?.name?.charAt(0) ?? '?'}
                                  </Text>
                                </LinearGradient>
                                {revealed && matchAns ? (
                                  <View
                                    style={[
                                      styles.compareAnswerSelf,
                                      {
                                        borderColor: Colors.primary.purple + '30',
                                        backgroundColor: Colors.primary.purple + '06',
                                      },
                                    ]}
                                  >
                                    <Text style={styles.compareAnswerText}>{matchAns}</Text>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    onPress={() => setRevealedKeys(prev => [...prev, q.id])}
                                    activeOpacity={0.85}
                                    style={styles.revealBtn}
                                  >
                                    <LinearGradient
                                      colors={[Colors.primary.red, Colors.primary.purple]}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 0 }}
                                      style={styles.revealBtnGrad}
                                    >
                                      <Lock size={13} color="#fff" />
                                      <Text style={styles.revealBtnText}>
                                        Révéler la réponse de {firstMatch?.name ?? 'votre match'}
                                      </Text>
                                    </LinearGradient>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── CTA Messagerie — affiché après les 3 jours ────────
              Connecté à /(tabs)/messages via router.push          */}
          {allDone && (
            <Animated.View
              style={[
                styles.ctaCard,
                {
                  opacity: ctaFade,
                  transform: [{ scale: ctaScale }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  Colors.primary.red + '10',
                  Colors.primary.purple + '08',
                  Colors.primary.orange + '06',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                {/* Icône */}
                <LinearGradient
                  colors={[Colors.primary.red + '20', Colors.primary.purple + '18']}
                  style={styles.ctaIconCircle}
                >
                  <Text style={{ fontSize: 40 }}>🎉</Text>
                </LinearGradient>

                {/* Textes */}
                <Text style={styles.ctaTitle}>Parcours Sondeur terminé !</Text>
                <Text style={styles.ctaDesc}>
                  Vous avez tous les deux répondu avec sincérité pendant 3 jours.
                  Le chat est maintenant disponible — il est temps de vous découvrir vraiment.
                </Text>

                {/* Score */}
                <LinearGradient
                  colors={[Colors.primary.red + '12', Colors.primary.purple + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaScoreRow}
                >
                  <Heart size={14} color={Colors.primary.red} fill={Colors.primary.red} />
                  <Text style={styles.ctaScoreText}>
                    {firstMatch.compatibility}% de compatibilité confirmée
                  </Text>
                </LinearGradient>

                {/* ─── Bouton principal → /(tabs)/messages ─────── */}
                <TouchableOpacity
                  onPress={goToMessages}
                  activeOpacity={0.88}
                  style={styles.ctaBtnWrap}
                >
                  <LinearGradient
                    colors={[
                      Colors.primary.red,
                      Colors.primary.purple,
                      Colors.primary.orange,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaBtn}
                  >
                    <MessageCircle size={20} color="#fff" />
                    <Text style={styles.ctaBtnText}>
                      Accéder à la messagerie
                    </Text>
                    <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.ctaNote}>
                  Votre identité complète sera révélée dans le chat
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.white },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: Colors.text.primary100,
  },
  headerSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.text.primary40,
    marginTop: 2,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.red + '10',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  creditsText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
    color: Colors.primary.red,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 56,
    gap: Spacing.lg,
  },

  // Match card
  matchCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  matchCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  matchAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAvatarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: '#fff',
  },
  matchInfo: { flex: 1 },
  matchName: { fontFamily: Typography.fontFamily.bold, fontSize: 18, color: Colors.text.primary100 },
  matchProfession: { fontFamily: Typography.fontFamily.regular, fontSize: 13, color: Colors.text.primary40, marginTop: 2 },
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  compatText: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: '#fff' },

  // Timeline
  timelineCard: {
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.text.primary100,
    marginBottom: Spacing.lg,
  },
  timeline: { gap: 0 },

  dayStepWrap: { flexDirection: 'row', gap: Spacing.md },
  dayStepLeft: { alignItems: 'center', width: 44 },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleLocked: {
    backgroundColor: Colors.neutral.border,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  dayConnector: { width: 2, flex: 1, marginVertical: 4, minHeight: 20 },
  dayStepInfo: { flex: 1, paddingBottom: Spacing.lg, gap: 4 },
  dayStepLabel: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.text.primary100 },
  dayStepLabelActive: { color: Colors.primary.red },
  dayStepLabelDone: { color: Colors.text.primary70 },
  dayStepLabelLocked: { color: Colors.text.primary40 },
  dayThemePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  dayThemeText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.text.primary70 },
  dayDoneLabel: { fontFamily: Typography.fontFamily.regular, fontSize: 11, color: Colors.primary.red },
  dayActiveLabel: { fontFamily: Typography.fontFamily.medium, fontSize: 11, color: Colors.primary.purple },
  dayLockedLabel: { fontFamily: Typography.fontFamily.regular, fontSize: 11, color: Colors.text.primary40 },
  nextDayNotice: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.08)' },
  nextDayNoticeText: { fontFamily: Typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: Colors.text.primary70 },

  // Question du jour
  questionDayCard: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  questionDayCardGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  questionDayCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  questionDayEmoji: { fontSize: 32 },
  questionDayTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 17, color: '#fff' },
  questionDaySub: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  questionDayArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Réponses comparées
  answersSection: { gap: Spacing.md },
  dayAnswersBlock: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  dayAnswersHeaderGrad: { padding: Spacing.md },
  dayAnswersHeaderText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.primary.red,
  },
  compareBlock: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border + '60',
  },
  compareQuestion: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.text.primary70,
    marginBottom: 4,
  },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compareAvatarSelf: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareAvatarMatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compareAvatarText: { fontFamily: Typography.fontFamily.bold, fontSize: 11, color: Colors.text.primary70 },
  compareAnswerSelf: {
    flex: 1,
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  compareAnswerText: { fontFamily: Typography.fontFamily.regular, fontSize: 13, color: Colors.text.primary100 },
  revealBtn: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  revealBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  revealBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: '#fff' },
  compatNote: {
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  compatNoteText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.text.primary70,
    fontStyle: 'italic',
  },

  // ── CTA Messagerie (après les 3 jours) ──────────────────────────
  ctaCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  ctaGrad: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  ctaTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.text.primary100,
    textAlign: 'center',
  },
  ctaDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.text.primary70,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
  },
  ctaScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginVertical: Spacing.xs,
  },
  ctaScoreText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: Colors.primary.red,
  },

  // Bouton principal CTA → /(tabs)/messages
  ctaBtnWrap: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 17,
    borderRadius: BorderRadius.lg,
  },
  ctaBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.2,
  },
  ctaNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.text.primary40,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // Vue questions
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border + '40',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.neutral.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 20, color: Colors.text.primary100 },
  questionHeaderCenter: { flex: 1, gap: 4 },
  questionDayBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  questionDayBadgeText: { fontFamily: Typography.fontFamily.bold, fontSize: 11, color: '#fff' },
  questionCounter: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.text.primary40 },

  questionScroll: { padding: Spacing.lg, paddingBottom: 40, gap: Spacing.lg },
  questionBubble: {
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    gap: Spacing.md,
  },
  questionBubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  boligoAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boligoName: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: Colors.primary.red },
  questionText: { fontFamily: Typography.fontFamily.regular, fontSize: 16, lineHeight: 25, color: Colors.text.primary100 },
  questionHint: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.text.primary40, fontStyle: 'italic', lineHeight: 18 },

  optionsWrap: { gap: Spacing.md },
  optionBtn: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
    overflow: 'hidden',
  },
  optionBtnSelected: { borderColor: 'transparent' },
  optionBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  optionText: { fontFamily: Typography.fontFamily.medium, fontSize: 15, color: Colors.text.primary100, padding: Spacing.lg },
  optionTextSelected: { fontFamily: Typography.fontFamily.medium, fontSize: 15, color: '#fff' },
  customInput: {
    borderWidth: 1,
    borderColor: Colors.primary.red + '30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary100,
    backgroundColor: Colors.neutral.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 6,
  },

  // État vide
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 22, color: Colors.text.primary100, marginBottom: Spacing.sm, textAlign: 'center' },
  emptyDesc: { fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary70, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  emptyBtnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  emptyBtn: { paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius.lg },
  emptyBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: 14, color: '#fff' },

  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  preparingCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  preparingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.text.primary70,
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshLink: { paddingVertical: 6 },
  refreshLinkText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.primary.red,
  },

  // ── Waiting State index.tsx ──
  waitingFullCard: {
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    marginTop: Spacing.md,
  },
  waitingIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  waitingTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.text.primary100,
    textAlign: 'center',
  },
  waitingDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.text.primary70,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: Spacing.md,
  },
  waitingInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary.purple + '08',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary.purple + '15',
  },
  waitingInfoText: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.primary.purple,
    lineHeight: 18,
  },
  waitingBackBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  waitingBackBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.primary.red,
    textDecorationLine: 'underline',
  },
});