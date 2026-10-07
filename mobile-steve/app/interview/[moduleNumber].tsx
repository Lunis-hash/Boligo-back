import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Alert, StatusBar, TextInput } from 'react-native';
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
  askIfMet,
  questionDisplayText,
} from '@/services/interview';
import { getReadableError } from '@/services/api';
import { useAuth } from '@/context/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Brain, CheckCircle2, LogOut, Check } from 'lucide-react-native';
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

interface Message {
  id: string;
  text: string;
  type: 'ai' | 'user';
  options?: { key: string; text: string; freeText?: boolean }[];
  questionId?: string;
  multiple?: boolean;
  maxChoices?: number;
  /** Réponses pré-cochées selon le pays (langues). */
  suggested?: boolean;
  /** Demande d'accord avant les questions sensibles. */
  consent?: boolean;
}

export default function DynamicInterviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { moduleNumber } = useLocalSearchParams<{ moduleNumber: string }>();
  const parsed = parseInt((moduleNumber || '0').replace(/^module-?/i, ''), 10);
  const modNum = isNaN(parsed) ? 0 : parsed;

  const [lang, setLang] = useState<InterviewLanguage | null>(null);
  const t = UI[lang ?? 'fr'];
  const currentModuleInfo = MODULE_INFO[lang ?? 'fr'][modNum] || { title: `Module ${modNum}`, subtitle: 'Grand Entretien BOLIGO' };

  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Choix multiple en cours (langues, signaux d'alerte) : clés cochées avant « Valider ».
  const [picked, setPicked] = useState<string[]>([]);
  // Accord pour les questions sensibles : undefined tant qu'il n'est pas lu.
  const consentRef = useRef<boolean | null | undefined>(undefined);
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

  useEffect(() => {
    if (lang) loadQuestions(lang);
    // La bascule de langue est gérée par switchLanguage (réponses conservées).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleNumber, lang === null]);

  const goToNextStep = () => {
    if (modNum < LAST_MODULE) {
      router.replace(`/interview/${modNum + 1}` as any);
    } else {
      router.replace('/interview/generation');
    }
  };

  const loadQuestions = async (language: InterviewLanguage) => {
    setIsLoading(true);
    try {
      const data = await InterviewService.getQuestions(modNum, language);
      setQuestions(data);
      setMessages([]);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setPicked([]);
      followUpRounds.current = 0;

      if (data.length > 0) {
        if (consentRef.current === undefined && data.some((q) => q.sensitive)) {
          consentRef.current = await InterviewService.getSensitiveConsent()
            .then((r) => r.consent)
            .catch(() => null);
        }
        presentQuestion(0, {}, data);
      } else {
        // Aucune question applicable (déjà répondues, filtres d'âge/genre…) :
        // on enregistre le module tel quel et on passe au suivant.
        await InterviewService.saveModule(modNum, {});
        goToNextStep();
        return;
      }
    } catch (error) {
      const ui = UI[language];
      Alert.alert(ui.errorTitle, getReadableError(error, ui.errorLoad), [
        { text: ui.retry, onPress: () => loadQuestions(language) },
        { text: ui.cancel, style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change la langue en cours de module sans perdre les réponses déjà
   * données : mêmes questions dans le même ordre, seuls les textes changent.
   */
  const switchLanguage = async (next: InterviewLanguage) => {
    if (next === lang || isAnswering || isSaving) return;
    setLang(next);
    await setInterviewLanguage(next);
    try {
      const data = await InterviewService.getQuestions(modNum, next);
      if (data.length !== questions.length) {
        loadQuestions(next);
        return;
      }
      setQuestions(data);
      const current = data[currentQuestionIndex];
      if (!current) return;
      // Demande d'accord en attente : la question n'est pas encore affichée.
      if (current.sensitive && consentRef.current !== true) return;
      setPicked(initialPicked(current));
      setOtherText(current.suggestedOther ?? '');
      // La question en attente est réécrite dans la nouvelle langue (pas de doublon).
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const translated: Message = {
          id: Math.random().toString(36).substring(7),
          text: questionDisplayText(current),
          type: 'ai',
          options: current.options,
          questionId: current.id,
          multiple: current.multiple,
          maxChoices: current.maxChoices,
          suggested: !!current.suggested?.length,
        };
        return last?.type === 'ai' && last.questionId === current.id
          ? [...prev.slice(0, -1), translated]
          : [...prev, translated];
      });
    } catch {
      /* la langue précédente reste affichée */
    }
  };

  /**
   * Affiche la question `index`. Questions sensibles : elles sont sautées si le
   * membre les a refusées, et précédées d'une demande d'accord sinon.
   */
  const presentQuestion = (
    index: number,
    answersSoFar: Record<string, string>,
    list: Question[] = questions,
  ) => {
    let i = index;
    // Sautées : questions sensibles refusées, et questions de suite que la
    // réponse donnée plus tôt n'ouvre pas.
    const skip = (q: Question) =>
      (consentRef.current === false && !!q.sensitive) || !askIfMet(q, answersSoFar);
    while (i < list.length && skip(list[i])) i++;
    if (i >= list.length) {
      handleModuleComplete(answersSoFar);
      return;
    }
    setCurrentQuestionIndex(i);
    if (list[i].sensitive && consentRef.current !== true) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          text: t.consentText,
          type: 'ai',
          consent: true,
          options: [
            { key: 'yes', text: t.consentYes },
            { key: 'no', text: t.consentNo },
          ],
        },
      ]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
      return;
    }
    addQuestionMessage(list[i]);
  };

  const handleConsent = async (accepted: boolean, label: string) => {
    if (isAnswering) return;
    setIsAnswering(true);
    try {
      await InterviewService.setSensitiveConsent(accepted);
    } catch (error) {
      Alert.alert(t.errorTitle, getReadableError(error, t.saveFail));
      setIsAnswering(false);
      return;
    }
    consentRef.current = accepted;
    addUserMessage(label);
    setTimeout(() => {
      presentQuestion(currentQuestionIndex, answers);
      setIsAnswering(false);
    }, 500);
  };

  const addQuestionMessage = (q: Question) => {
    // Langues : celles du pays de résidence sont cochées d'office.
    setPicked(initialPicked(q));
    setOtherText(q.suggestedOther ?? '');
    addAIMessage(questionDisplayText(q), q.options, q.id, q.multiple, q.maxChoices, !!q.suggested?.length);
  };

  const addAIMessage = (
    text: string,
    options?: { key: string; text: string; freeText?: boolean }[],
    questionId?: string,
    multiple?: boolean,
    maxChoices?: number,
    suggested?: boolean,
  ) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      text,
      type: 'ai',
      options,
      questionId,
      multiple,
      maxChoices,
      suggested,
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

  const handleAnswer = async (
    optionKey: string,
    optionText: string,
    extra: Record<string, string> = {},
  ) => {
    if (isAnswering) return;
    setIsAnswering(true);
    const currentQ = questions[currentQuestionIndex];
    addUserMessage(optionText);
    const newAnswers = { ...answers, [currentQ.id]: optionKey, ...extra };
    setAnswers(newAnswers);
    setPicked([]);
    setOtherText('');

    const nextIndex = currentQuestionIndex + 1;
    const progress = questions.length > 0 ? (nextIndex / questions.length) : 1;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
    if (nextIndex < questions.length) {
      setTimeout(() => {
        presentQuestion(nextIndex, newAnswers);
        setIsAnswering(false);
      }, 700);
    } else {
      handleModuleComplete(newAnswers);
    }
  };

  /** Coche ou décoche une réponse (choix multiple, dans la limite du maximum). */
  const togglePicked = (key: string) => {
    const currentQ = questions[currentQuestionIndex];
    if (currentQ) setPicked((prev) => togglePick(currentQ, prev, key));
  };

  const currentFree = questions[currentQuestionIndex]
    ? freeTextOption(questions[currentQuestionIndex])
    : undefined;
  // « Une autre langue » cochée : la langue doit être écrite avant de valider.
  const needsOtherText = !!currentFree && picked.includes(currentFree.key);
  const canConfirm = picked.length > 0 && (!needsOtherText || isValidFreeText(otherText));

  const confirmPicked = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ || !canConfirm) return;
    const other = needsOtherText ? otherText.replace(/\s+/g, ' ').trim() : undefined;
    const { key, text } = joinMultipleAnswer(currentQ, picked, other);
    handleAnswer(key, text, other ? { [`${currentQ.id}${FREE_TEXT_SUFFIX}`]: other } : {});
  };

  const handleModuleComplete = async (finalAnswers: Record<string, string>) => {
    setIsSaving(true);
    try {
      await InterviewService.saveModule(modNum, finalAnswers);

      // Filet de sécurité : une question de suite débloquée par ces réponses
      // (et pas encore posée) est posée tout de suite, sans quitter le module.
      if (followUpRounds.current < 2) {
        followUpRounds.current += 1;
        const more = (await InterviewService.getQuestions(modNum, lang ?? 'fr').catch(
          () => [] as Question[],
        )).filter((q) => !(q.id in finalAnswers));
        if (more.length) {
          setAnswers(finalAnswers);
          setQuestions(more);
          setCurrentQuestionIndex(0);
          setIsAnswering(false);
          presentQuestion(0, finalAnswers, more);
          return;
        }
      }

      if (modNum < LAST_MODULE) {
        setTimeout(() => {
          addAIMessage(t.saved);
          setTimeout(() => goToNextStep(), 1400);
        }, 800);
      } else {
        goToNextStep();
      }
    } catch (error) {
      Alert.alert(
        t.saveFailTitle,
        `${getReadableError(error, t.saveFail)}\n${t.saveRetry}`,
        [
          { text: t.cancel, style: 'cancel', onPress: () => setIsAnswering(false) },
          { text: t.retry, onPress: () => handleModuleComplete(finalAnswers) },
        ]
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
            {t.question} {currentQuestionIndex + 1}/{questions.length || 4}
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
                {message.multiple && (
                  <Text style={styles.multipleHint}>
                    {message.maxChoices ? t.maxAnswers.replace('{n}', String(message.maxChoices)) : t.severalAnswers}
                  </Text>
                )}
                {message.suggested && <Text style={styles.multipleHint}>{t.suggested}</Text>}
                {message.options.map((option, optionIndex) => {
                  const checked = message.multiple && picked.includes(option.key);
                  // Lettre affichée selon la position : les langues ne proposent que
                  // quatre des options (clés A, B, H, I), lues « A, B, C, D ».
                  const letter = String.fromCharCode(65 + optionIndex);
                  return (
                    <TouchableOpacity
                      key={option.key}
                      testID={`option-${option.key}`}
                      style={[styles.optionButton, checked && styles.optionButtonChecked]}
                      onPress={() =>
                        message.consent
                          ? handleConsent(option.key === 'yes', option.text)
                          : message.multiple
                            ? togglePicked(option.key)
                            : handleAnswer(option.key, option.text)
                      }
                      accessibilityRole={message.multiple ? 'checkbox' : 'button'}
                      accessibilityState={message.multiple ? { checked: !!checked } : undefined}
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
                {message.multiple && needsOtherText && (
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
                {message.multiple && (
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
