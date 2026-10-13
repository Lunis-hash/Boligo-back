import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Alert, StatusBar, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import {
  InterviewService,
  Question,
  LAST_MODULE,
  InterviewLanguage,
  getInterviewLanguage,
  setInterviewLanguage,
  joinMultipleAnswer,
  freeTextOption,
  initialPicked,
  togglePick,
  isValidFreeText,
  FREE_TEXT_SUFFIX,
  questionDisplayText,
  ageRangeAnswer,
} from '@/services/interview';
import {
  Answers,
  ageInputIssue,
  answerLabel,
  lastAnswered,
  nextUnanswered,
  previousAnswered,
  progressOf,
  visibleIndices,
  widenToIdeal,
  withoutUnmet,
} from '@/services/interviewNavigation';
import { getReadableError } from '@/services/api';
import { useAuth } from '@/context/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Brain, CheckCircle2, LogOut, Check, ChevronLeft } from 'lucide-react-native';
import { ModuleIcon } from '@/components/BrandIcons';

const MODULE_INFO: Record<InterviewLanguage, Record<number, { title: string; subtitle: string }>> = {
  fr: {
    0: { title: 'Filtres non-négociables', subtitle: 'Vos critères et filtres essentiels' },
    1: { title: 'Identité & Culture', subtitle: 'Origines, traditions et spiritualité' },
    2: { title: 'Attachement & Régulation émotionnelle', subtitle: 'Gestion des émotions et sécurité affective' },
    3: { title: 'Vécu & Contexte', subtitle: 'Parcours de vie et enseignements' },
    4: { title: 'Vision économique', subtitle: 'Gestion financière et organisation du foyer' },
    5: { title: 'Dynamique sociale & familiale', subtitle: 'Relations familiales et entourage' },
    6: { title: 'Quotidien, Communication réelle & Limites', subtitle: 'Communication, intimité et limites' },
    7: { title: 'Trajectoire de vie & Personnalité', subtitle: 'Ambitions, projets et tempérament' },
    8: { title: 'Projet de couple', subtitle: 'Engagement et vision commune du couple' },
    9: { title: 'Pouvoir, Effort & Capacité à aimer', subtitle: 'Leadership, compromis et don de soi' },
    10: { title: 'Alchimie, Vibe & Désir', subtitle: 'Clef de voûte et alchimie relationnelle' },
  },
  en: {
    0: { title: 'Non-negotiable filters', subtitle: 'Your essential criteria' },
    1: { title: 'Identity & Culture', subtitle: 'Origins, traditions and spirituality' },
    2: { title: 'Attachment & Emotional regulation', subtitle: 'Managing emotions and emotional security' },
    3: { title: 'Past & Context', subtitle: 'Life journey and lessons learned' },
    4: { title: 'Economic vision', subtitle: 'Money and running a household' },
    5: { title: 'Social & family dynamics', subtitle: 'Family relationships and your circle' },
    6: { title: 'Daily life, Real communication & Limits', subtitle: 'Communication, intimacy and limits' },
    7: { title: 'Life trajectory & Personality', subtitle: 'Ambitions, projects and temperament' },
    8: { title: 'Couple project', subtitle: 'Commitment and a shared vision' },
    9: { title: 'Power, Effort & Capacity to love', subtitle: 'Leadership, compromise and giving' },
    10: { title: 'Alchemy, Vibe & Desire', subtitle: 'The keystone of attraction' },
  },
};

/** Textes de l'écran dans la langue de l'entretien. */
const UI: Record<InterviewLanguage, Record<string, string>> = {
  fr: {
    module: 'MODULE',
    question: 'Question',
    pause: 'Pause',
    loading: 'Chargement des questions...',
    saving: 'Enregistrement de vos réponses...',
    savingSub: 'Mise à jour de votre fiche BOLIGO',
    saved: 'Merci, vos réponses sont enregistrées. Passons au module suivant.',
    validate: 'Valider',
    ageMin: 'Âge minimum',
    ageMax: 'Âge maximum',
    ageBetween: 'Entre',
    ageAnd: 'et',
    ageHint: 'Deux âges, de 18 à 99 ans.',
    ageBounds: 'Les âges vont de 18 à 99 ans.',
    ageOrder: 'Le premier âge doit être inférieur ou égal au second.',
    ageWiden: 'Ces âges doivent inclure votre tranche idéale ({ideal} ans) : nous enregistrerons {range} ans.',
    ageUnit: 'ans',
    back: 'Question précédente',
    edit: 'Modifier',
    editingHint: 'Votre réponse actuelle est cochée : gardez-la ou choisissez-en une autre.',
    saveAgain: 'Touchez de nouveau votre réponse pour réessayer.',
    severalAnswers: 'Plusieurs réponses possibles',
    maxAnswers: '{n} réponses au plus',
    suggested: 'Pré-coché selon votre pays : modifiez librement.',
    otherPlaceholder: 'Précisez (ex. : bambara, allemand)',
    errorTitle: 'Erreur',
    errorLoad: 'Impossible de charger les questions de ce module.',
    retry: 'Réessayer',
    cancel: 'Annuler',
    saveFailTitle: 'Sauvegarde impossible',
    saveFail: 'La connexion avec le serveur a été interrompue.',
    saveRetry: 'Voulez-vous réessayer la sauvegarde ?',
    pauseTitle: 'Faire une pause ?',
    pauseText: 'Votre progression est automatiquement sauvegardée. L’entretien est obligatoire pour accéder aux profils et découvrir vos matchs compatibles.',
    keepGoing: 'Continuer l’entretien',
    signOut: 'Se déconnecter',
    languageHint: 'Langue de l’entretien',
    consentText:
      'Les questions suivantes portent sur votre origine, votre religion ou votre vie intime. Ce sont des données sensibles : BOLIGO ne les enregistre qu’avec votre accord explicite. Elles servent à calculer votre compatibilité et peuvent apparaître, résumées, sur votre profil. Sans accord, ces questions sont passées, et les réponses qui touchent à la foi ou à l’intimité ne vous sont pas proposées ailleurs dans l’entretien. Vous pourrez retirer votre accord à tout moment depuis votre profil : vos réponses seront alors effacées.',
    consentYes: 'J’accepte de répondre',
    consentNo: 'Je préfère passer ces questions',
  },
  en: {
    module: 'MODULE',
    question: 'Question',
    pause: 'Pause',
    loading: 'Loading the questions...',
    saving: 'Saving your answers...',
    savingSub: 'Updating your BOLIGO profile',
    saved: 'Thank you, your answers are saved. Let’s move on to the next module.',
    validate: 'Confirm',
    ageMin: 'Minimum age',
    ageMax: 'Maximum age',
    ageBetween: 'Between',
    ageAnd: 'and',
    ageHint: 'Two ages, from 18 to 99.',
    ageBounds: 'Ages range from 18 to 99.',
    ageOrder: 'The first age must be lower than or equal to the second.',
    ageWiden: 'These ages must include your ideal range ({ideal}): we will save {range}.',
    ageUnit: 'years old',
    back: 'Previous question',
    edit: 'Edit',
    editingHint: 'Your current answer is selected: keep it or choose another one.',
    saveAgain: 'Tap your answer again to retry.',
    severalAnswers: 'Several answers possible',
    maxAnswers: '{n} answers at most',
    suggested: 'Pre-selected for your country: change it freely.',
    otherPlaceholder: 'Please specify (e.g. Bambara, German)',
    errorTitle: 'Error',
    errorLoad: 'The questions of this module could not be loaded.',
    retry: 'Try again',
    cancel: 'Cancel',
    saveFailTitle: 'Saving failed',
    saveFail: 'The connection to the server was interrupted.',
    saveRetry: 'Do you want to try saving again?',
    pauseTitle: 'Take a break?',
    pauseText: 'Your progress is saved automatically. The interview is required to see profiles and discover your compatible matches.',
    keepGoing: 'Continue the interview',
    signOut: 'Sign out',
    languageHint: 'Interview language',
    consentText:
      'The next questions are about your origins, your religion or your intimate life. This is sensitive data: BOLIGO only saves it with your explicit consent. It is used to work out your compatibility and may appear, summarised, on your profile. Without consent, these questions are skipped, and answers touching on faith or intimacy are not offered elsewhere in the interview. You can withdraw your consent at any time from your profile: your answers will then be deleted.',
    consentYes: 'I agree to answer',
    consentNo: 'I’d rather skip these questions',
  },
};

export default function DynamicInterviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { moduleNumber, at } = useLocalSearchParams<{ moduleNumber: string; at?: string }>();
  const parsed = parseInt((moduleNumber || '0').replace(/^module-?/i, ''), 10);
  const modNum = isNaN(parsed) ? 0 : parsed;

  const [lang, setLang] = useState<InterviewLanguage | null>(null);
  const t = UI[lang ?? 'fr'];
  const currentModuleInfo = MODULE_INFO[lang ?? 'fr'][modNum] || { title: `Module ${modNum}`, subtitle: 'Grand Entretien BOLIGO' };

  const [isLoading, setIsLoading] = useState(true);
  /** Questions du module (répondues comprises), dans l'ordre. */
  const [questions, setQuestions] = useState<Question[]>([]);
  /** Réponses enregistrées du module (et précisions écrites). */
  const [answers, setAnswers] = useState<Answers>({});
  /** Index de la question affichée ; -1 quand le module est terminé. */
  const [current, setCurrent] = useState(-1);
  // Accord pour les questions sensibles : undefined tant qu'il n'est pas lu.
  const [consent, setConsent] = useState<boolean | null | undefined>(undefined);
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [moduleDone, setModuleDone] = useState(false);
  /** Erreur d'enregistrement, affichée sous la question (on peut réessayer). */
  const [saveError, setSaveError] = useState<string | null>(null);
  // Choix multiple en cours (langues, signaux d'alerte) : clés cochées avant « Valider ».
  const [picked, setPicked] = useState<string[]>([]);
  /** Relectures du module après enregistrement (questions de suite débloquées). */
  const followUpRounds = useRef(0);
  // Précision écrite de l'option « une autre langue ».
  const [otherText, setOtherText] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Langue de l'entretien : choix enregistré, sinon celle de l'appareil.
  useEffect(() => {
    getInterviewLanguage().then(setLang);
  }, []);

  // Page web déclarée dans la langue affichée : le navigateur ne propose plus
  // de « traduire » le français (source des libellés « Validateur », « Annuleur »).
  useEffect(() => {
    if (Platform.OS === 'web' && lang && typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  useEffect(() => {
    if (lang) loadModule(lang, at === 'last' ? 'last' : 'resume');
    // La bascule de langue est gérée par switchLanguage (réponses conservées).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleNumber, at, lang === null]);

  useEffect(() => {
    const p = progressOf(questions, answers, consent, current);
    Animated.timing(progressAnim, {
      toValue: p.total ? p.answered / p.total : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
  }, [questions, answers, consent, current, progressAnim]);

  const goToNextStep = () => {
    if (modNum < LAST_MODULE) {
      router.replace(`/interview/${modNum + 1}` as any);
    } else {
      router.replace('/interview/generation');
    }
  };

  /** Affiche la question `index`, avec la réponse déjà enregistrée pré-sélectionnée. */
  const show = (index: number, list: Question[], ans: Answers) => {
    const q = list[index];
    setCurrent(index);
    setSaveError(null);
    if (!q) return;
    const saved = ans[q.id];
    setPicked(saved && q.multiple ? saved.split(',').map((k) => k.trim()) : initialPicked(q));
    setOtherText(ans[`${q.id}${FREE_TEXT_SUFFIX}`] ?? q.suggestedOther ?? '');
    // Plage acceptée : préremplie avec la tranche idéale, qu'elle doit englober.
    const range = saved ?? (q.id === 'V82_M0_02' ? ans.V82_M0_01 : undefined);
    const [lo, hi] = (range ?? '').split('-');
    setAgeMin(lo ?? '');
    setAgeMax(hi ?? '');
  };

  /**
   * Charge le module complet. `resume` : première question sans réponse
   * (reprise après interruption) ; `last` : dernière question répondue (retour
   * depuis le module suivant).
   */
  const loadModule = async (language: InterviewLanguage, mode: 'resume' | 'last') => {
    setIsLoading(true);
    setModuleDone(false);
    followUpRounds.current = 0;
    try {
      const review = await InterviewService.getModule(modNum, language);
      if (!review.editable && Object.keys(review.answers).length === 0 && review.questions.length > 0) {
        // Entretien terminé : rien ne se modifie plus.
        router.replace('/interview/generation');
        return;
      }
      let cons = consent;
      if (cons === undefined && review.questions.some((q) => q.sensitive)) {
        cons = await InterviewService.getSensitiveConsent()
          .then((r) => r.consent)
          .catch(() => null);
        setConsent(cons);
      }
      const list = review.questions;
      const ans = withoutUnmet(list, review.answers);
      setQuestions(list);
      setAnswers(ans);
      let start = mode === 'last' ? lastAnswered(list, ans, cons) : nextUnanswered(list, ans, cons);
      if (start < 0 && mode === 'last') {
        // Rien à relire ici (questions passées) : on remonte encore d'un module.
        if (modNum > 0) {
          router.replace(`/interview/${modNum - 1}?at=last` as any);
          return;
        }
        start = nextUnanswered(list, ans, cons);
      }
      if (start < 0) {
        // Aucune question restante : le module est enregistré tel quel.
        await completeModule(ans, list, cons);
        return;
      }
      show(start, list, ans);
    } catch (error) {
      const ui = UI[language];
      Alert.alert(ui.errorTitle, getReadableError(error, ui.errorLoad), [
        { text: ui.retry, onPress: () => loadModule(language, mode) },
        { text: ui.cancel, style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change la langue en cours de module sans perdre les réponses : mêmes
   * questions dans le même ordre, seuls les textes changent.
   */
  const switchLanguage = async (next: InterviewLanguage) => {
    if (next === lang || isAnswering || isSaving) return;
    setLang(next);
    await setInterviewLanguage(next);
    try {
      const review = await InterviewService.getModule(modNum, next);
      const sameList =
        review.questions.length === questions.length &&
        review.questions.every((q, i) => q.id === questions[i]?.id);
      if (!sameList) {
        loadModule(next, 'resume');
        return;
      }
      setQuestions(review.questions);
    } catch {
      /* la langue précédente reste affichée */
    }
  };

  const handleConsent = async (accepted: boolean) => {
    if (isAnswering) return;
    setIsAnswering(true);
    try {
      await InterviewService.setSensitiveConsent(accepted);
      setConsent(accepted);
      if (!accepted) {
        const n = nextUnanswered(questions, answers, false, current);
        if (n < 0) await completeModule(answers, questions, false);
        else show(n, questions, answers);
      }
    } catch (error) {
      Alert.alert(t.errorTitle, getReadableError(error, t.saveFail));
    } finally {
      setIsAnswering(false);
    }
  };

  /** Enregistre la réponse à la question affichée, aussitôt, puis passe à la suivante sans réponse. */
  const submit = async (value: string, freeText?: string) => {
    const q = questions[current];
    if (!q || isAnswering) return;
    setIsAnswering(true);
    setSaveError(null);
    try {
      const res = await InterviewService.saveAnswer(modNum, q.id, value, freeText);
      let next: Answers = { ...answers, [q.id]: value };
      const otherKey = `${q.id}${FREE_TEXT_SUFFIX}`;
      if (freeText !== undefined) next[otherKey] = freeText;
      else delete next[otherKey];
      for (const id of res?.removed ?? []) {
        delete next[id];
        delete next[`${id}${FREE_TEXT_SUFFIX}`];
      }
      next = withoutUnmet(questions, { ...next, ...(res?.adjusted ?? {}) });
      setAnswers(next);
      if (res?.allModulesCompleted || res?.alreadyCompleted) {
        router.replace('/interview/generation');
        return;
      }
      const n = nextUnanswered(questions, next, consent, current);
      if (n < 0) await completeModule(next, questions, consent);
      else show(n, questions, next);
    } catch (error) {
      setSaveError(`${getReadableError(error, t.saveFail)} ${t.saveAgain}`);
    } finally {
      setIsAnswering(false);
    }
  };

  /** Retour à la question précédente, y compris dans le module précédent. */
  const goBack = () => {
    if (isAnswering || isSaving) return;
    const p = previousAnswered(questions, answers, consent, current);
    if (p >= 0) {
      setModuleDone(false);
      show(p, questions, answers);
    } else if (modNum > 0) {
      router.replace(`/interview/${modNum - 1}?at=last` as any);
    }
  };

  /** Module entièrement répondu : enregistrement final, puis module suivant. */
  const completeModule = async (
    finalAnswers: Answers,
    list: Question[],
    cons: boolean | null | undefined,
  ): Promise<void> => {
    setIsSaving(true);
    setCurrent(-1);
    try {
      const res = await InterviewService.saveModule(modNum, {});
      if (res?.allModulesCompleted || res?.alreadyCompleted) {
        router.replace('/interview/generation');
        return;
      }
      // Filet de sécurité : une question de suite débloquée par ces réponses
      // (et pas encore posée) est posée tout de suite, sans quitter le module.
      if (followUpRounds.current < 2) {
        followUpRounds.current += 1;
        const review = await InterviewService.getModule(modNum, lang ?? 'fr').catch(() => null);
        if (review) {
          const ans = withoutUnmet(review.questions, { ...review.answers, ...finalAnswers });
          const n = nextUnanswered(review.questions, ans, cons);
          if (n >= 0) {
            setQuestions(review.questions);
            setAnswers(ans);
            show(n, review.questions, ans);
            return;
          }
        }
      }
      setModuleDone(true);
      if (modNum < LAST_MODULE) {
        setTimeout(() => goToNextStep(), 1600);
      } else {
        goToNextStep();
      }
    } catch (error) {
      Alert.alert(
        t.saveFailTitle,
        `${getReadableError(error, t.saveFail)}\n${t.saveRetry}`,
        [
          { text: t.cancel, style: 'cancel', onPress: () => show(lastAnswered(list, finalAnswers, cons), list, finalAnswers) },
          { text: t.retry, onPress: () => completeModule(finalAnswers, list, cons) },
        ],
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = () => {
    Alert.alert(
      t.pauseTitle,
      t.pauseText,
      [
        { text: t.keepGoing, style: 'cancel' },
        {
          text: t.signOut,
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const currentQ = current >= 0 ? questions[current] : undefined;
  const awaitingConsent = !!currentQ?.sensitive && consent !== true;
  const currentFree = currentQ ? freeTextOption(currentQ) : undefined;
  // « Une autre langue » cochée : la langue doit être écrite avant de valider.
  const needsOtherText = !!currentFree && picked.includes(currentFree.key);
  const canConfirm = picked.length > 0 && (!needsOtherText || isValidFreeText(otherText));

  // Plage d'âges : erreurs dans le champ, et plage acceptée élargie si besoin.
  const ageIssue = ageInputIssue(ageMin, ageMax);
  const ageAnswer = ageIssue ? null : ageRangeAnswer(ageMin, ageMax);
  const ideal = answers.V82_M0_01;
  const widened =
    currentQ?.id === 'V82_M0_02' && ageAnswer ? widenToIdeal(ageAnswer, ideal) : null;
  const ageMessage =
    ageIssue === 'bounds'
      ? t.ageBounds
      : ageIssue === 'order'
        ? t.ageOrder
        : widened
          ? t.ageWiden
              .replace('{ideal}', (ideal ?? '').replace('-', ' – '))
              .replace('{range}', widened.replace('-', ' – '))
          : null;

  const confirmAge = () => {
    if (!ageAnswer) return;
    submit(widened ?? ageAnswer);
  };

  /** Coche ou décoche une réponse (choix multiple, dans la limite du maximum). */
  const togglePicked = (key: string) => {
    if (currentQ) setPicked((prev) => togglePick(currentQ, prev, key));
  };

  const confirmPicked = () => {
    if (!currentQ || !canConfirm) return;
    const other = needsOtherText ? otherText.replace(/\s+/g, ' ').trim() : undefined;
    const { key } = joinMultipleAnswer(currentQ, picked, other);
    submit(key, other);
  };

  const progress = progressOf(questions, answers, consent, current);
  const canGoBack =
    !isSaving && (previousAnswered(questions, answers, consent, current) >= 0 || modNum > 0);
  // Fil de discussion : questions visibles déjà répondues avant la question affichée.
  const history = visibleIndices(questions, answers, consent).filter(
    (i) => (current < 0 || i < current) && !!answers[questions[i].id],
  );
  const editing = !!currentQ && !!answers[currentQ.id];

  if (isLoading || !lang) {
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
          <Text style={styles.loadingBadgeText}>{t.module} {modNum} / 10</Text>
        </View>

        <Text style={styles.loadingTitle}>{currentModuleInfo.title}</Text>
        <Text style={styles.loadingSubtitle}>{currentModuleInfo.subtitle}</Text>

        <View style={styles.loadingStatusRow}>
          <ActivityIndicator size="small" color={Colors.primary.red} />
          <Text style={styles.loadingStatusText}>{t.loading}</Text>
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
            <ModuleIcon module={modNum} size={14} />
            <Text style={styles.moduleBadgeText}>{t.module} {modNum} / 10</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.langSwitch} accessibilityRole="radiogroup" accessibilityLabel={t.languageHint}>
              {(['fr', 'en'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  testID={`interview-lang-${l}`}
                  onPress={() => switchLanguage(l)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: lang === l }}
                  style={[styles.langOption, lang === l && styles.langOptionActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langOptionText, lang === l && styles.langOptionTextActive]}>
                    {l.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.pauseBtn}
              onPress={handlePause}
              activeOpacity={0.7}
            >
              <LogOut size={16} color={Colors.text.primary70} />
              <Text style={styles.pauseBtnText}>{t.pause}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerModuleTitle}>{currentModuleInfo.title}</Text>
            <Text style={styles.headerModuleSub}>{currentModuleInfo.subtitle}</Text>
          </View>
          <Text style={styles.questionCounterText}>
            {t.question} {progress.position}/{progress.total || 1}
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
                  outputRange: ['4%', '100%'],
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Fil de discussion : chaque réponse donnée se touche pour être modifiée. */}
        {history.map((i) => {
          const q = questions[i];
          return (
            <View key={q.id} style={styles.messageWrapper}>
              <View style={styles.aiBubbleContainer}>
                <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.aiAvatarCircle}>
                  <Sparkles size={14} color="#FFF" />
                </LinearGradient>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiText}>{q.text}</Text>
                </View>
              </View>
              <TouchableOpacity
                testID={`answer-${q.id}`}
                style={styles.userBubble}
                onPress={() => {
                  if (isAnswering || isSaving) return;
                  setModuleDone(false);
                  show(i, questions, answers);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t.edit} : ${answerLabel(q, answers, t.ageUnit)}`}
                activeOpacity={0.8}>
                <Text style={styles.userText}>{answerLabel(q, answers, t.ageUnit)}</Text>
                <Text style={styles.userEditHint}>{t.edit}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {currentQ && awaitingConsent && (
          <View style={styles.messageWrapper}>
            <View style={styles.aiBubbleContainer}>
              <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.aiAvatarCircle}>
                <Sparkles size={14} color="#FFF" />
              </LinearGradient>
              <View style={styles.aiBubble}>
                <Text style={styles.aiText}>{t.consentText}</Text>
              </View>
            </View>
            <View style={styles.optionsContainer}>
              {[
                { key: 'yes', text: t.consentYes },
                { key: 'no', text: t.consentNo },
              ].map((option, optionIndex) => (
                <TouchableOpacity
                  key={option.key}
                  testID={`option-${option.key}`}
                  style={styles.optionButton}
                  onPress={() => handleConsent(option.key === 'yes')}
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  disabled={isAnswering}>
                  <View style={styles.optionLetterCircle}>
                    <Text style={styles.optionLetterText}>{String.fromCharCode(65 + optionIndex)}</Text>
                  </View>
                  <Text style={styles.optionText}>{option.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {currentQ && !awaitingConsent && !isSaving && (
          <View style={styles.messageWrapper}>
            <View style={styles.aiBubbleContainer}>
              <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.aiAvatarCircle}>
                <Sparkles size={14} color="#FFF" />
              </LinearGradient>
              <View style={styles.aiBubble}>
                <Text style={styles.aiText} testID="interview-question">{questionDisplayText(currentQ)}</Text>
              </View>
            </View>

            <View style={styles.optionsContainer}>
              {editing && <Text style={styles.editingHint}>{t.editingHint}</Text>}
              {currentQ.multiple && (
                <Text style={styles.multipleHint}>
                  {currentQ.maxChoices ? t.maxAnswers.replace('{n}', String(currentQ.maxChoices)) : t.severalAnswers}
                </Text>
              )}
              {!!currentQ.suggested?.length && !editing && <Text style={styles.multipleHint}>{t.suggested}</Text>}
              {currentQ.options.map((option, optionIndex) => {
                const checked = currentQ.multiple
                  ? picked.includes(option.key)
                  : answers[currentQ.id] === option.key;
                // Lettre affichée selon la position : les langues ne proposent que
                // quatre des options (clés A, B, H, I), lues « A, B, C, D ».
                const letter = String.fromCharCode(65 + optionIndex);
                return (
                  <TouchableOpacity
                    key={option.key}
                    testID={`option-${option.key}`}
                    style={[styles.optionButton, checked && styles.optionButtonChecked]}
                    onPress={() => (currentQ.multiple ? togglePicked(option.key) : submit(option.key))}
                    accessibilityRole={currentQ.multiple ? 'checkbox' : 'button'}
                    accessibilityState={currentQ.multiple ? { checked } : { selected: checked }}
                    activeOpacity={0.75}
                    disabled={isAnswering}>
                    <View style={[styles.optionLetterCircle, checked && styles.optionLetterCircleChecked]}>
                      {checked ? (
                        <Check size={14} color="#FFF" strokeWidth={3} />
                      ) : (
                        <Text style={styles.optionLetterText}>{letter}</Text>
                      )}
                    </View>
                    <Text style={styles.optionText}>{option.text}</Text>
                  </TouchableOpacity>
                );
              })}
              {currentQ.multiple && needsOtherText && (
                <TextInput
                  testID="interview-other"
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder={t.otherPlaceholder}
                  placeholderTextColor={Colors.text.inactive}
                  maxLength={60}
                  style={styles.otherInput}
                />
              )}
              {currentQ.input === 'ageRange' && (
                <>
                  <View style={styles.ageRow} accessibilityRole="none">
                    <Text style={styles.ageWord}>{t.ageBetween}</Text>
                    <TextInput
                      testID="interview-age-min"
                      value={ageMin}
                      onChangeText={(v) => setAgeMin(v.replace(/\D/g, '').slice(0, 2))}
                      placeholder="25"
                      accessibilityLabel={t.ageMin}
                      placeholderTextColor={Colors.text.inactive}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={2}
                      style={[styles.otherInput, styles.ageInput, ageIssue && ageIssue !== 'incomplete' && styles.ageInputError]}
                    />
                    <Text style={styles.ageWord}>{t.ageAnd}</Text>
                    <TextInput
                      testID="interview-age-max"
                      value={ageMax}
                      onChangeText={(v) => setAgeMax(v.replace(/\D/g, '').slice(0, 2))}
                      placeholder="35"
                      accessibilityLabel={t.ageMax}
                      placeholderTextColor={Colors.text.inactive}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={2}
                      style={[styles.otherInput, styles.ageInput, ageIssue && ageIssue !== 'incomplete' && styles.ageInputError]}
                    />
                    <Text style={styles.ageWord}>{t.ageUnit}</Text>
                  </View>
                  <Text
                    testID="interview-age-message"
                    style={[styles.multipleHint, ageIssue && ageIssue !== 'incomplete' ? styles.ageErrorText : null]}>
                    {ageMessage ?? t.ageHint}
                  </Text>
                  <TouchableOpacity
                    testID="interview-age-validate"
                    onPress={confirmAge}
                    disabled={!ageAnswer || isAnswering}
                    accessibilityRole="button"
                    style={[styles.validateBtn, (!ageAnswer || isAnswering) && styles.validateBtnDisabled]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.validateBtnText}>{t.validate}</Text>
                  </TouchableOpacity>
                </>
              )}
              {currentQ.multiple && (
                <TouchableOpacity
                  testID="interview-validate"
                  onPress={confirmPicked}
                  disabled={!canConfirm || isAnswering}
                  accessibilityRole="button"
                  style={[styles.validateBtn, (!canConfirm || isAnswering) && styles.validateBtnDisabled]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.validateBtnText}>{t.validate}</Text>
                </TouchableOpacity>
              )}
              {saveError && (
                <Text testID="interview-save-error" style={styles.ageErrorText} accessibilityLiveRegion="polite">
                  {saveError}
                </Text>
              )}
              {isAnswering && <ActivityIndicator size="small" color={Colors.primary.red} />}
            </View>
          </View>
        )}

        {canGoBack && !moduleDone && (
          <TouchableOpacity
            testID="interview-back"
            onPress={goBack}
            disabled={isAnswering}
            accessibilityRole="button"
            style={styles.backBtn}
            activeOpacity={0.7}>
            <ChevronLeft size={16} color={Colors.text.primary70} />
            <Text style={styles.backBtnText}>{t.back}</Text>
          </TouchableOpacity>
        )}

        {moduleDone && (
          <View style={styles.aiBubbleContainer}>
            <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.aiAvatarCircle}>
              <Sparkles size={14} color="#FFF" />
            </LinearGradient>
            <View style={styles.aiBubble}>
              <Text style={styles.aiText}>{t.saved}</Text>
            </View>
          </View>
        )}

        {isSaving && (
          <View style={styles.savingCard}>
            <View style={styles.savingIconBadge}>
              <CheckCircle2 size={18} color={Colors.primary.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.savingTitle}>{t.saving}</Text>
              <Text style={styles.savingSub}>{t.savingSub}</Text>
            </View>
            <ActivityIndicator size="small" color={Colors.primary.red} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // « Entre [25] et [35] ans » : champs étroits à largeur fixe, retour à la
  // ligne permis, aucun débordement à 360 px.
  ageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  ageWord: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary100,
  },
  ageInput: {
    width: 64,
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  ageInputError: {
    borderColor: '#C62828',
  },
  ageErrorText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#C62828',
  },
  editingHint: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary.purple,
  },
  userEditHint: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary70,
    textDecorationLine: 'underline',
  },
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
    fontFamily: Typography.fontFamily.regular, fontSize: 12,
  },
  moduleBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langSwitch: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.backgroundLight,
    padding: 2,
  },
  langOption: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  langOptionActive: {
    backgroundColor: Colors.neutral.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  langOptionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary70,
    letterSpacing: 0.4,
  },
  langOptionTextActive: {
    color: Colors.primary.red,
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
  optionButtonChecked: {
    borderColor: Colors.primary.red,
    backgroundColor: Colors.primary.red + '08',
  },
  optionLetterCircleChecked: {
    backgroundColor: Colors.primary.red,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.primary100,
    backgroundColor: Colors.neutral.white,
  },
  multipleHint: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text.primary70,
  },
  validateBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary.red,
    borderRadius: BorderRadius.full,
    paddingVertical: 11,
    paddingHorizontal: 26,
    marginTop: 2,
  },
  validateBtnDisabled: {
    opacity: 0.45,
  },
  validateBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
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
