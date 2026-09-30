import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Platform,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { InterviewService } from '@/services/interview';
import { ChevronRight, ChevronLeft, Check, Heart, Star, Sparkles, ShieldCheck } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = Math.min(SCREEN_WIDTH - Spacing.lg * 2, 380);
const CARD_GAP   = Spacing.md;

// ─── Piliers par défaut en attendant la réponse API ────────────────
const DEFAULT_PILLARS = [
  {
    id: 'valeurs',
    emoji: '💎',
    label: 'Vos valeurs & principes',
    tagline: 'Ce qui guide vos décisions au quotidien',
    percentage: 94,
    color: Colors.primary.red,
    pastel: 'rgba(233,64,87,0.08)',
    description: 'Vous savez clairement ce qui compte pour vous. Cette clarté morale est le socle d\'une alliance stable et d\'une relation durable.',
    metrics: [
      { label: 'Authenticité', value: 98 },
      { label: 'Loyauté', value: 92 },
      { label: 'Respect', value: 95 },
    ],
  },
  {
    id: 'projet',
    emoji: '🌱',
    label: 'Projet de vie & Famille',
    tagline: 'Votre vision du foyer et de l\'avenir',
    percentage: 88,
    color: '#10B981',
    pastel: 'rgba(16, 185, 129, 0.08)',
    description: 'Vous avancez avec intention et lucidité. Vous recherchez un partenaire qui partage votre engagement pour construire un foyer harmonieux.',
    metrics: [
      { label: 'Projet commun', value: 92 },
      { label: 'Vision long terme', value: 88 },
      { label: 'Harmonie du foyer', value: 90 },
    ],
  },
  {
    id: 'communication',
    emoji: '💬',
    label: 'Communication & Conflits',
    tagline: 'Votre manière de dialoguer et désamorcer',
    percentage: 91,
    color: Colors.primary.purple,
    pastel: 'rgba(124, 92, 232, 0.08)',
    description: 'Vous privilégiez l\'écoute active et la sincérité, en évitant les non-dits et le silence pesant dans le couple.',
    metrics: [
      { label: 'Écoute active', value: 93 },
      { label: 'Transparence', value: 94 },
      { label: 'Résolution calme', value: 89 },
    ],
  },
  {
    id: 'finances',
    emoji: '💰',
    label: 'Économie & Responsabilités',
    tagline: 'Votre rapport à l\'argent et au foyer',
    percentage: 86,
    color: '#D9AE3C',
    pastel: 'rgba(217, 174, 60, 0.08)',
    description: 'Vous abordez la gestion financière avec responsabilité, équité et transparence au sein du couple.',
    metrics: [
      { label: 'Transparence', value: 88 },
      { label: 'Équité & soutien', value: 89 },
      { label: 'Projets communs', value: 90 },
    ],
  },
  {
    id: 'intimite',
    emoji: '🔥',
    label: 'Tendresse & Intimité',
    tagline: 'Votre vision de l\'affection affective',
    percentage: 90,
    color: '#F97316',
    pastel: 'rgba(249, 115, 22, 0.08)',
    description: 'L\'expression de l\'affection et la présence émotionnelle sont des moteurs clés de votre épanouissement relationnel.',
    metrics: [
      { label: 'Complicité', value: 92 },
      { label: 'Présence', value: 88 },
      { label: 'Affection', value: 94 },
    ],
  },
  {
    id: 'limites',
    emoji: '🛡️',
    label: 'Limites & Respect',
    tagline: 'Ce que vous acceptez et refusez',
    percentage: 96,
    color: Colors.primary.red,
    pastel: 'rgba(233,64,87,0.08)',
    description: 'Vous avez une conscience aiguë de vos limites non-négociables, ce qui vous préserve de toute forme de toxicité.',
    metrics: [
      { label: 'Cadre sain', value: 98 },
      { label: 'Respect mutuel', value: 100 },
      { label: 'Clarté morale', value: 95 },
    ],
  },
];

// ─── Composant progress circulaire ────────────────────────────────
function CircularProgress({
  size,
  percentage,
  color,
  strokeWidth = 4,
}: {
  size: number;
  percentage: number;
  color: string;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth}
          strokeOpacity={0.12} fill="transparent"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round" fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

// ─── Composant card pilier ─────────────────────────────────────────
function PillarCard({
  pillar,
  onPress,
}: {
  pillar: typeof DEFAULT_PILLARS[0];
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.cardInner}
      >
        {/* Top section */}
        <View style={styles.cardTop}>
          {/* Progress + emoji */}
          <View style={styles.cardVisual}>
            <CircularProgress size={76} percentage={pillar.percentage} color={pillar.color} strokeWidth={5} />
            <View style={[styles.cardEmoji, { backgroundColor: pillar.pastel }]}>
              <Text style={{ fontSize: 26 }}>{pillar.emoji}</Text>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: pillar.color }]}>
              <Text style={styles.percentBadgeText}>{pillar.percentage}%</Text>
            </View>
          </View>

          {/* Texte */}
          <View style={styles.cardText}>
            <Text style={styles.cardLabel}>{pillar.label}</Text>
            <Text style={styles.cardTagline}>{pillar.tagline}</Text>
            <Text style={styles.cardDesc} numberOfLines={3}>{pillar.description}</Text>
          </View>
        </View>

        {/* Métriques */}
        <View style={styles.cardMetrics}>
          {pillar.metrics?.map((m) => (
            <View key={m.label} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <View style={styles.metricTrack}>
                <View
                  style={[
                    styles.metricFill,
                    { width: `${m.value}%`, backgroundColor: pillar.color },
                  ]}
                />
              </View>
              <Text style={[styles.metricVal, { color: pillar.color }]}>{m.value}%</Text>
            </View>
          ))}
        </View>

        {/* CTA détail */}
        <View style={[styles.cardCta, { borderTopColor: pillar.pastel?.replace('0.08', '0.2') || Colors.neutral.border }]}>
          <Text style={[styles.cardCtaText, { color: pillar.color }]}>Explorer cette dimension</Text>
          <ChevronRight size={14} color={pillar.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────
export default function InterviewSummaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showIntro, setShowIntro]       = useState(true);
  const [activeIndex, setActiveIndex]   = useState(0);
  const [pillars, setPillars]           = useState<any[]>(DEFAULT_PILLARS);
  const [selectedPillar, setSelectedPillar] = useState<any | null>(null);
  const [globalScore, setGlobalScore]   = useState(92);
  const [synthesisText, setSynthesisText] = useState('');
  const [keyValues, setKeyValues]       = useState<string[]>([]);
  const [needsList, setNeedsList]       = useState<string[]>([]);

  // Animations intro
  const introFade   = useRef(new Animated.Value(0)).current;
  const introScale  = useRef(new Animated.Value(0.95)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;
  const modalAnim   = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Charger la vraie carte mentale depuis l'IA
    const fetchMentalMap = async () => {
      try {
        const data = await InterviewService.getSummary();
        if (data) {
          if (Array.isArray(data.pillars) && data.pillars.length > 0) {
            setPillars(data.pillars);
          }
          if (typeof data.maturityScore === 'number') {
            setGlobalScore(data.maturityScore);
          }
          if (data.synthesis) {
            setSynthesisText(data.synthesis);
          }
          if (Array.isArray(data.keyValues)) {
            setKeyValues(data.keyValues);
          }
          if (Array.isArray(data.needsList)) {
            setNeedsList(data.needsList);
          }
        }
      } catch (e) {
        console.log('Utilisation des données par défaut pour le bilan');
      }
    };

    fetchMentalMap();

    Animated.parallel([
      Animated.timing(introFade,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(introScale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(introFade, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setShowIntro(false);
        Animated.parallel([
          Animated.timing(contentFade,  { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.spring(contentSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
        ]).start();
        Animated.timing(scoreAnim, {
          toValue: globalScore,
          duration: 1400,
          useNativeDriver: false,
        }).start();
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Modal
  useEffect(() => {
    if (selectedPillar) {
      Animated.spring(modalAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
    }
  }, [selectedPillar]);

  const closeModal = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
      setSelectedPillar(null)
    );
  };

  // Scroll des cards
  const flatRef = useRef<FlatList>(null);

  const goNext = () => {
    if (activeIndex < pillars.length - 1) {
      const next = activeIndex + 1;
      setActiveIndex(next);
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };
  const goPrev = () => {
    if (activeIndex > 0) {
      const prev = activeIndex - 1;
      setActiveIndex(prev);
      flatRef.current?.scrollToIndex({ index: prev, animated: true });
    }
  };

  // ── Intro ────────────────────────────────────────────────────────
  if (showIntro) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
        <Animated.View
          style={[styles.introWrap, { opacity: introFade, transform: [{ scale: introScale }] }]}
        >
          <LinearGradient
            colors={[Colors.primary.red + '15', Colors.primary.purple + '10', Colors.primary.orange + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.introCircle}
          >
            <Text style={{ fontSize: 42 }}>✨</Text>
          </LinearGradient>
          <Text style={styles.introTitle}>Analyse de votre profil</Text>
          <Text style={styles.introSub}>Nous préparons votre bilan de compatibilité…</Text>

          {/* Dots de chargement */}
          <View style={styles.dotsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.3, backgroundColor: Colors.primary.red }]} />
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Écran principal ──────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <Heart size={11} color={Colors.primary.red} fill={Colors.primary.red} />
              <Text style={styles.headerBadgeText}>Votre bilan de compatibilité</Text>
            </View>
            <Text style={styles.title}>Votre profil{'\n'}est prêt 🎉</Text>
            <Text style={styles.subtitle}>
              Voici ce que votre parcours révèle sur vous. Ces 6 dimensions guident nos suggestions de rencontres.
            </Text>
          </View>

          {/* Score global */}
          <View style={styles.scoreWrap}>
            <LinearGradient
              colors={[Colors.primary.red + '08', Colors.primary.purple + '06', Colors.primary.orange + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scoreCard}
            >
              <View style={styles.scoreLeft}>
                <View style={styles.scoreCircleWrap}>
                  <CircularProgress size={72} percentage={globalScore} color={Colors.primary.red} strokeWidth={6} />
                  <View style={styles.scoreCenter}>
                    <Text style={styles.scoreNumber}>{globalScore}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.scoreRight}>
                <Text style={styles.scoreTitle}>Score de clarté</Text>
                <Text style={styles.scoreDesc}>
                  Vous avez un profil clair et cohérent. Cela facilite grandement les connexions authentiques.
                </Text>
                <View style={styles.scoreBadge}>
                  <Star size={11} color={Colors.primary.orange} fill={Colors.primary.orange} />
                  <Text style={styles.scoreBadgeText}>Profil de qualité</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Titre section cards */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vos 6 dimensions clés</Text>
            <Text style={styles.sectionSub}>
              {activeIndex + 1} / {pillars.length}
            </Text>
          </View>

          {/* Cards swipeables */}
          <FlatList
            ref={flatRef}
            data={pillars}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
              setActiveIndex(Math.min(idx, pillars.length - 1));
            }}
            renderItem={({ item }) => (
              <PillarCard pillar={item} onPress={() => setSelectedPillar(item)} />
            )}
          />

          {/* Navigation flèches */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={goPrev}
              activeOpacity={0.7}
              style={[styles.navBtn, activeIndex === 0 && styles.navBtnDisabled]}
            >
              <ChevronLeft size={20} color={activeIndex === 0 ? Colors.text.primary40 : Colors.text.primary100} />
            </TouchableOpacity>

            {/* Dots indicateurs */}
            <View style={styles.dotsIndicator}>
              {pillars.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setActiveIndex(i);
                    flatRef.current?.scrollToIndex({ index: i, animated: true });
                  }}
                >
                  {i === activeIndex ? (
                    <LinearGradient
                      colors={[Colors.primary.red, Colors.primary.purple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.dotActive}
                    />
                  ) : (
                    <View style={styles.dotInactive} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={goNext}
              activeOpacity={0.7}
              style={[styles.navBtn, activeIndex === pillars.length - 1 && styles.navBtnDisabled]}
            >
              <ChevronRight size={20} color={activeIndex === pillars.length - 1 ? Colors.text.primary40 : Colors.text.primary100} />
            </TouchableOpacity>
          </View>

          {/* Synthèse IA personnalisée */}
          <View style={styles.messageBox}>
            <LinearGradient
              colors={[Colors.primary.red + '08', Colors.primary.purple + '06']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.messageGrad}
            >
              <Text style={styles.messageText}>
                ✨ {synthesisText || "Votre profil montre une belle cohérence entre vos valeurs fondamentales et votre projet de vie. L'algorithme BOLIGO analyse désormais les profils pour vous proposer des rencontres hautement compatibles."}
              </Text>
            </LinearGradient>
          </View>

          {/* Bouton CTA */}
          <View style={styles.ctaWrap}>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.85}
              style={styles.ctaBtnWrap}
            >
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaBtnText}>Découvrir mes matchs</Text>
                <ChevronRight size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.ctaNote}>
              Profil complété à 100% · Matching activé
            </Text>
          </View>

        </Animated.View>
      </ScrollView>

      {/* ── Modal détail pilier ─────────────────────────────────── */}
      <Modal
        visible={selectedPillar !== null}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [{
                  translateY: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.modalHandle} />

            {selectedPillar && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header modal */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalEmojiCircle, { backgroundColor: selectedPillar.pastel }]}>
                    <Text style={{ fontSize: 32 }}>{selectedPillar.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedPillar.label}</Text>
                    <Text style={styles.modalTagline}>{selectedPillar.tagline}</Text>
                  </View>
                  <View style={[styles.modalPercent, { backgroundColor: selectedPillar.color + '15' }]}>
                    <Text style={[styles.modalPercentText, { color: selectedPillar.color }]}>
                      {selectedPillar.percentage}%
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.modalDesc}>{selectedPillar.description}</Text>

                {/* Métriques */}
                <View style={styles.modalMetrics}>
                  {selectedPillar.metrics.map((m: any) => (
                    <View key={m.label} style={styles.modalMetricRow}>
                      <View style={styles.modalMetricTop}>
                        <Text style={styles.modalMetricLabel}>{m.label}</Text>
                        <Text style={[styles.modalMetricVal, { color: selectedPillar.color }]}>
                          {m.value}%
                        </Text>
                      </View>
                      <View style={styles.modalMetricTrack}>
                        <LinearGradient
                          colors={[selectedPillar.color, selectedPillar.color + 'AA']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.modalMetricFill, { width: `${m.value}%` as any }]}
                        />
                      </View>
                    </View>
                  ))}
                </View>

                {/* Fermer */}
                <TouchableOpacity
                  onPress={closeModal}
                  activeOpacity={0.8}
                  style={styles.modalClose}
                >
                  <View style={styles.modalCloseBtn}>
                    <Check size={16} color={Colors.text.primary70} />
                    <Text style={styles.modalCloseText}>Compris !</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.white },

  // Intro
  introWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  introCircle: {
    width: 100, height: 100,
    borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  introTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.text.primary100,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  introSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.text.primary70,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Scroll
  scrollContent: { paddingBottom: 48 },

  // Header
  header: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, alignItems: 'center' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary.red + '10',
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderRadius: BorderRadius.full, marginBottom: Spacing.md,
  },
  headerBadgeText: {
    fontFamily: Typography.fontFamily.medium, fontSize: 11,
    color: Colors.primary.red, letterSpacing: 0.5,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 30, lineHeight: 38,
    color: Colors.text.primary100,
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14, lineHeight: 22,
    color: Colors.text.primary70, textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },

  // Score global
  scoreWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  scoreCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  scoreLeft: { alignItems: 'center' },
  scoreCircleWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  scoreCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20, color: Colors.primary.red,
  },
  scoreRight: { flex: 1 },
  scoreTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16, color: Colors.text.primary100,
    marginBottom: 4,
  },
  scoreDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12, lineHeight: 18,
    color: Colors.text.primary70, marginBottom: Spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary.orange + '12',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  scoreBadgeText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11, color: Colors.primary.orange,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18, color: Colors.text.primary100,
  },
  sectionSub: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13, color: Colors.text.primary40,
  },

  // FlatList cards
  flatListContent: {
    paddingHorizontal: Spacing.xl,
    gap: CARD_GAP,
    paddingRight: Spacing.xl + CARD_GAP,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
    overflow: 'hidden',
    shadowColor: Colors.neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardInner: { padding: Spacing.lg },
  cardTop: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  cardVisual: {
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', width: 80, height: 80,
  },
  cardEmoji: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  percentBadge: {
    position: 'absolute', bottom: 0, right: -4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  percentBadgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10, color: Colors.neutral.white,
  },
  cardText: { flex: 1, justifyContent: 'center' },
  cardLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 17, color: Colors.text.primary100,
    marginBottom: 2,
  },
  cardTagline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11, color: Colors.text.primary40,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13, lineHeight: 19,
    color: Colors.text.primary70,
  },
  cardMetrics: { gap: Spacing.sm, marginBottom: Spacing.md },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metricLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12, color: Colors.text.primary70,
    width: 100,
  },
  metricTrack: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: Colors.neutral.backgroundLight,
    overflow: 'hidden',
  },
  metricFill: { height: '100%', borderRadius: 3 },
  metricVal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12, width: 36, textAlign: 'right',
  },
  cardCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingTop: Spacing.md, borderTopWidth: 1, gap: 4,
  },
  cardCtaText: {
    fontFamily: Typography.fontFamily.medium, fontSize: 13,
  },

  // Navigation
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, marginTop: Spacing.lg,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.neutral.backgroundLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  navBtnDisabled: { opacity: 0.35 },
  dotsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotActive: { width: 20, height: 7, borderRadius: 4 },
  dotInactive: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.neutral.border,
  },

  // Message bienveillant
  messageBox: {
    marginHorizontal: Spacing.xl, marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  messageGrad: { padding: Spacing.lg, borderRadius: BorderRadius.lg },
  messageText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14, lineHeight: 22,
    color: Colors.text.primary70,
  },

  // CTA
  ctaWrap: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  ctaBtnWrap: {
    width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  ctaBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16, color: Colors.neutral.white, letterSpacing: 0.2,
  },
  ctaNote: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11, color: Colors.text.primary40,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: BorderRadius.xl * 2,
    borderTopRightRadius: BorderRadius.xl * 2,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: Colors.neutral.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, marginBottom: Spacing.lg,
  },
  modalEmojiCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20, color: Colors.text.primary100,
  },
  modalTagline: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11, color: Colors.text.primary40,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2,
  },
  modalPercent: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  modalPercentText: {
    fontFamily: Typography.fontFamily.bold, fontSize: 15,
  },
  modalDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15, lineHeight: 24,
    color: Colors.text.primary70, marginBottom: Spacing.xl,
  },
  modalMetrics: { gap: Spacing.md, marginBottom: Spacing.xl },
  modalMetricRow: {},
  modalMetricTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalMetricLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14, color: Colors.text.primary70,
  },
  modalMetricVal: {
    fontFamily: Typography.fontFamily.bold, fontSize: 14,
  },
  modalMetricTrack: {
    height: 7, borderRadius: 4,
    backgroundColor: Colors.neutral.backgroundLight, overflow: 'hidden',
  },
  modalMetricFill: { height: '100%', borderRadius: 4 },
  modalClose: { marginTop: Spacing.sm },
  modalCloseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.backgroundLight,
  },
  modalCloseText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15, color: Colors.text.primary70,
  },
});