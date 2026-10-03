import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, Component, ReactNode, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Heart, Sparkles, ChevronRight, ChevronLeft, RefreshCw, CheckCircle2, AlertTriangle, Link2 } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import client, { getReadableError } from '@/services/api';
import { getDiscussionTopics, hasMajorDivergence } from '@/services/compatibility';
import cacheService from '@/services/cacheService';
import soundService from '@/services/soundService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Error Boundary ──────────────
class DiscoverErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean; error: string;}> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: any) { return { hasError: true, error: String(error) }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FF4D67', marginBottom: 12 }}>Erreur Discover</Text>
          <Text style={{ fontSize: 14, color: '#333', textAlign: 'center' }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Types ─────────────────────────────────────────────────────────
interface MatchProfile {
  id: string;
  firstName: string;
  profession: string;
  compatibility: number;
  /** Lecture qualitative du score (« Belle compatibilité »). */
  compatibilityLabel?: string;
  /** « il » ou « elle », pour accorder les titres de section. */
  pronoun?: 'il' | 'elle';
  slogan: string;
  age?: number;
  location?: string;
  distance?: string;
  aiAnalysis?: string;
  positivePoints?: string[];
  warningPoint?: string;
  /** Sujets calculés par le moteur de divergences du serveur (prioritaires). */
  discussionTopics?: { id: string; title: string; prompt: string }[];
  hardStop?: boolean;
  details?: Record<string, string>;
  interests?: { label: string; common: boolean }[];
  threeWords?: string[];
  expectations?: { icon: string; text: string }[];
  /** Affinités par module du Grand Entretien (0 → 10), calculées par le serveur. */
  mentalMap: {
    id: string;
    label: string;
    emoji: string;
    /** null : aucune réponse comparable sur ce module. */
    value: number | null;
    color: string;
    /** Lecture humaine du module (« Alignement fort sur … »). */
    verdict?: string;
  }[];
}

interface ActiveMatch {
  id: string;
  name: string;
  compatibility: number;
  compatibilityLabel?: string;
  pronoun?: 'il' | 'elle';
  profession: string;
  location: string;
  age?: number;
  phase: string;
  journeyId: string | null;
  proposalId?: string;
  ended?: boolean;
  slogan?: string;
  mentalMap?: MatchProfile['mentalMap'];
  aiAnalysis?: string;
  positivePoints?: string[];
  warningPoint?: string;
  details?: MatchProfile['details'];
  interests?: MatchProfile['interests'];
  threeWords?: MatchProfile['threeWords'];
  expectations?: MatchProfile['expectations'];
  discussionTopics?: MatchProfile['discussionTopics'];
  hardStop?: boolean;
}

// ─── Lecture des fiches renvoyées par le serveur ───────────────────
/** Libellés de la grille « Profil » (clés renvoyées par le serveur). */
const DETAIL_LABELS: Record<string, { label: string; emoji: string }> = {
  situation: { label: 'Situation', emoji: '💍' },
  children: { label: 'Enfants', emoji: '👶' },
  childrenWish: { label: "Désir d'enfants", emoji: '🍼' },
  religion: { label: 'Spiritualité', emoji: '🙏' },
  education: { label: 'Études', emoji: '🎓' },
  lifestyle: { label: 'Vie dans 5 ans', emoji: '🌱' },
  city: { label: 'Ville', emoji: '📍' },
};

function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : undefined;
}

/** Fiche serveur → fiche affichée. Aucune valeur n'est inventée : un champ absent est masqué. */
function toMatchProfile(p: any, idx: number): MatchProfile {
  return {
    id: p.userId ?? p.id ?? `profile-${idx}`,
    firstName: p.firstName ?? p.name ?? 'Membre BOLIGO',
    age: typeof p.age === 'number' ? p.age : undefined,
    location: p.location || undefined,
    profession: p.profession || '',
    compatibility: typeof p.compatibility === 'number' ? p.compatibility : 0,
    compatibilityLabel: p.compatibilityLabel,
    pronoun: p.pronoun === 'elle' ? 'elle' : p.pronoun === 'il' ? 'il' : undefined,
    slogan: p.slogan || '',
    aiAnalysis: p.aiAnalysis || undefined,
    positivePoints: asArray<string>(p.positivePoints),
    warningPoint: p.warningPoint || undefined,
    discussionTopics: asArray(p.discussionTopics),
    hardStop: p.hardStop === true,
    details: p.details && typeof p.details === 'object' && Object.keys(p.details).length > 0 ? p.details : undefined,
    interests: asArray(p.interests),
    threeWords: asArray<string>(p.threeWords),
    expectations: asArray(p.expectations),
    mentalMap: asArray<MatchProfile['mentalMap'][0]>(p.mentalMap) ?? [],
  };
}

// ─── Anneaux pulsants animés ───────────────────────────────────────
function PulsingRings() {
  const anims = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 600),
          Animated.timing(anim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const rings = [
    { size: 154, color: Colors.primary.red,    opacity: 0.10 },
    { size: 118, color: Colors.primary.purple, opacity: 0.14 },
    { size: 86,  color: Colors.primary.orange, opacity: 0.16 },
  ];

  return (
    <>
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: r.size, height: r.size,
            borderRadius: r.size / 2,
            borderWidth: 1,
            borderColor: r.color,
            opacity: r.opacity,
            transform: [{ scale: anims[i] }],
          }}
        />
      ))}
    </>
  );
}

// ─── Particule flottante ──────────────────────────────────────────
function FloatingParticle({
  color, size, delay, style,
}: {
  color: string; size: number; delay: number; style: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        {
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) },
          ],
          opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.8, 0.3] }),
        }
      ]}
    />
  );
}

// ─── Composant de formatage Markdown-like ──────────────────────
const renderFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <Text>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i} style={{ color: Colors.text.primary70 }}>{part}</Text>;
      })}
    </Text>
  );
};

// ─── Composants UI ────────────────────────────────────────────────
/**
 * Cercle de compatibilité : le pourcentage global est écrit au centre et
 * l'anneau se remplit d'autant. (Avant, le cercle affichait l'initiale du
 * prénom : pour « Oli », un « O » qui se lisait comme un 0.)
 */
const RING_SIZE = 112;
const RING_STROKE = 8;

function ScoreRing({ percent, color }: { percent: number; color: string }) {
  const enterScale = useRef(new Animated.Value(0.82)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    enterScale.setValue(0.82);
    enterOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(enterScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(enterOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [safe]);

  return (
    <Animated.View
      style={[styles.avatarContainer, { opacity: enterOpacity, transform: [{ scale: enterScale }] }]}
      accessible
      accessibilityLabel={`${safe} % de compatibilité`}
      testID="discover-score-ring"
    >
      <PulsingRings />

      {/* Particules géométriques */}
      <FloatingParticle color={Colors.primary.red}    size={9}  delay={0}    style={{ top: -34, left: -26 }} />
      <FloatingParticle color={Colors.primary.purple} size={7}  delay={800}  style={{ top: -22, right: -28 }} />
      <FloatingParticle color={Colors.primary.orange} size={10} delay={1600} style={{ bottom: -30, left: -20 }} />
      <FloatingParticle color={Colors.primary.red}    size={6}  delay={400}  style={{ bottom: -24, right: -22 }} />

      <View style={styles.scoreRing}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius}
            stroke={color} strokeOpacity={0.15} strokeWidth={RING_STROKE} fill={Colors.neutral.white}
          />
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={radius}
            stroke={color} strokeWidth={RING_STROKE} fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - safe / 100)}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <Text style={[styles.scoreRingValue, { color }]} testID="discover-score-value">
          {safe}
          <Text style={styles.scoreRingPercent}> %</Text>
        </Text>
        <Text style={styles.scoreRingCaption}>compatibles</Text>
      </View>
    </Animated.View>
  );
}

/** Confirmation avant une action qui ferme une invitation (web : window.confirm). */
function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

function scoreColor(percent: number): string {
  if (percent >= 75) return '#10B981';
  if (percent >= 55) return '#F59E0B';
  return '#EF4444';
}

function PillarRow({ pillar, delay }: { pillar: MatchProfile['mentalMap'][0]; delay: number }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: (pillar.value ?? 0) / 100,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pillar.value, delay]);

  return (
    <View style={styles.pillarRow}>
      <View style={styles.pillarHeader}>
        <Text style={styles.pillarLabel}>{pillar.emoji ? `${pillar.emoji} ` : ''}{pillar.label}</Text>
        <Text style={[styles.pillarVal, { color: pillar.color }]}>{pillar.value === null ? '—' : `${pillar.value} %`}</Text>
      </View>
      <View style={styles.pillarTrack}>
        <Animated.View
          style={[
            styles.pillarFill,
            {
              backgroundColor: pillar.color,
              width: barWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${pillar.value ?? 0}%`],
              }),
            },
          ]}
        />
      </View>
      {!!pillar.verdict && <Text style={styles.pillarVerdict}>{pillar.verdict}</Text>}
    </View>
  );
}

// ─── Squelette de chargement "Shimmer" ──────────────────────────────
function DiscoverSkeleton({ pulseAnim }: { pulseAnim: Animated.Value }) {
  return (
    <View style={styles.skeletonContainer}>
      {/* Carte principale en mode chargement */}
      <View style={styles.skeletonCard}>
        {/* Badge de compatibilité */}
        <Animated.View style={[styles.skeletonCompatBadge, { opacity: pulseAnim }]} />

        {/* Radar pulsant au centre */}
        <View style={styles.skeletonAvatarWrapper}>
          <PulsingRings />
          <FloatingParticle color={Colors.primary.red}    size={9}  delay={0}    style={{ top: -34, left: -26 }} />
          <FloatingParticle color={Colors.primary.purple} size={7}  delay={800}  style={{ top: -22, right: -28 }} />
          <FloatingParticle color={Colors.primary.orange} size={10} delay={1600} style={{ bottom: -30, left: -20 }} />
          <FloatingParticle color={Colors.primary.red}    size={6}  delay={400}  style={{ bottom: -24, right: -22 }} />

          <Animated.View style={[styles.skeletonAvatarCore, { opacity: pulseAnim }]}>
            <ActivityIndicator size="small" color="#fff" />
          </Animated.View>
        </View>

        {/* Infos du bas de la carte */}
        <View style={styles.skeletonCardFooter}>
          <Text style={styles.skeletonLoadingText}>Recherche de profils compatibles...</Text>
          <Animated.View style={[styles.skeletonTextLine, { width: '40%', height: 20, marginBottom: 12, opacity: pulseAnim }]} />
          
          <View style={styles.skeletonBadgesRow}>
            <Animated.View style={[styles.skeletonBadge, { width: 50, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonBadge, { width: 70, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonBadge, { width: 60, opacity: pulseAnim }]} />
          </View>
        </View>
      </View>

      {/* Détails secondaires en dessous de la carte */}
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonSection}>
          <View style={styles.skeletonSectionHeader}>
            <Animated.View style={[styles.skeletonIcon, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonTextLine, { width: '50%', height: 12, opacity: pulseAnim }]} />
          </View>
          <View style={styles.skeletonAnalysisCard}>
            <Animated.View style={[styles.skeletonTextLine, { width: '95%', height: 12, marginBottom: 10, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonTextLine, { width: '90%', height: 12, marginBottom: 10, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonTextLine, { width: '75%', height: 12, opacity: pulseAnim }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────
export default function DiscoverScreenWrapper() {
  return (
    <DiscoverErrorBoundary>
      <DiscoverScreen />
    </DiscoverErrorBoundary>
  );
}

function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { credits, refreshCredits } = useAppContext();

  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [overlayMode, setOverlayMode] = useState<'none' | 'connect' | 'no_credit' | 'success'>('none');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [acceptingProposal, setAcceptingProposal] = useState<{ id: string, name: string } | null>(null);
  const [answeringProposal, setAnsweringProposal] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [loading]);

  // Fiche affichée : match en cours, sinon like reçu, sinon profil de Découverte.
  // Toutes les données viennent du serveur (moteur de fiches BOLIGO).
  const currentMatch: MatchProfile | null = activeMatch
    ? toMatchProfile({ ...activeMatch, firstName: activeMatch.name }, 0)
    : receivedLikes.length > 0
      ? toMatchProfile(receivedLikes[0], 0)
      : profiles[profileIndex] ?? null;

  // Sujets à aborder : ceux du moteur de divergences serveur (réponses réelles aux
  // entretiens) quand ils existent, sinon dérivés des piliers de compatibilité.
  const discussionTopics = currentMatch
    ? currentMatch.discussionTopics?.length
      ? currentMatch.discussionTopics
      : getDiscussionTopics(currentMatch.compatibility, currentMatch.mentalMap)
    : [];
  const majorDivergence = currentMatch
    ? currentMatch.hardStop === true || hasMajorDivergence(currentMatch.compatibility, currentMatch.mentalMap)
    : false;

  const hasLikedMe = receivedLikes.length > 0 && currentMatch?.id === receivedLikes[0].userId;
  const existingLike = receivedLikes[0];
  const hasLoadedRef = useRef(false);
  const prevLikesCountRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const isAlreadyLoaded = hasLoadedRef.current;
      initScreen(isAlreadyLoaded);
      hasLoadedRef.current = true;
    }, [])
  );

  const initScreen = async (silent = false) => {
    try {
      if (!silent && profiles.length === 0 && !activeMatch) {
        setLoading(true);
      }
      refreshCredits();

      const matchRes = await client.get('/matching/my-matches');
      const matches: ActiveMatch[] = matchRes.data ?? [];

      // Un parcours terminé reste visible dans Messages mais ne bloque plus la Découverte.
      setActiveMatch(matches.find((m) => !m.ended) ?? null);

      const likesRes = await client.get('/matching/received-likes');
      const likes: any[] = (likesRes.data ?? []).map((like: any) => ({
        ...like,
        firstName: like.firstName ?? like.name ?? 'Utilisateur',
        name: like.name ?? like.firstName ?? 'Utilisateur',
      }));

      // Ne jouer le son QUE si un NOUVEAU like est effectivement reçu
      if (likes.length > prevLikesCountRef.current && prevLikesCountRef.current > 0) {
        soundService.playLikeReceived();
      }
      prevLikesCountRef.current = likes.length;
      setReceivedLikes(likes);

      const response = await client.get('/matching/discover');

      // ✅ Chargement des profils du backend/IA avec leurs données spécifiques
      const fetchedProfiles: any[] = response.data ?? [];
      let realProfiles: MatchProfile[] = [];

      if (fetchedProfiles.length > 0) {
        realProfiles = fetchedProfiles.map(toMatchProfile);
      }

      setProfiles(realProfiles);
    } catch (error: any) {
      console.log('⚠️ [Discover] Aucun profil disponible ou erreur réseau:', error?.message || error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(28)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!currentMatch) return;
    cardFade.setValue(0);
    cardSlide.setValue(16);

    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [profileIndex, profiles.length, activeMatch]);

  const openOverlay = (mode: 'connect' | 'no_credit' | 'success') => {
    setOverlayMode(mode);
    overlayAnim.setValue(0);
    Animated.spring(overlayAnim, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }).start();
  };

  const closeOverlay = () => {
    Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setOverlayMode('none'));
  };

  const handleConnect = async () => {
    if (!currentMatch || connecting) return;

    if (acceptingProposal) {
      setConnecting(true);
      await performAcceptLike(acceptingProposal.id, acceptingProposal.name);
      return;
    }

    if (credits < 1) {
      setOverlayMode('no_credit');
      return;
    }

    setConnecting(true);
    soundService.playLikeSent();

    try {
      // Le serveur vérifie la règle d'or et débite lui-même le crédit.
      const response = await client.post('/matching/connect', { targetUserId: currentMatch.id });
      if (!response.data?.success) {
        if (response.data?.code === 'NO_CREDIT') {
          await refreshCredits();
          setOverlayMode('no_credit');
          return;
        }
        closeOverlay();
        Alert.alert('Connexion impossible', response.data?.message || 'Ce profil n\'est plus disponible.');
        initScreen(true);
        return;
      }
      await refreshCredits();

      if (response.data.journey) {
        const matchRes = await client.get('/matching/my-matches');
        const live = (matchRes.data ?? []).find((m: ActiveMatch) => !m.ended);
        if (live) setActiveMatch(live);
        soundService.playMatchCelebration();
        setOverlayMode('success');
      } else {
        closeOverlay();
        initScreen(true);
      }
    } catch (error) {
      closeOverlay();
      Alert.alert('Connexion impossible', getReadableError(error));
    } finally {
      setConnecting(false);
    }
  };

  const handleAcceptLike = (proposalId: string, likeName: string) => {
    setAcceptingProposal({ id: proposalId, name: likeName });
    openOverlay('connect');
  };

  const performAcceptLike = async (proposalId: string, likeName: string) => {
    if (credits < 1) {
      setAcceptingProposal(null);
      setOverlayMode('no_credit');
      setConnecting(false);
      return;
    }

    // Le serveur débite le crédit et crée le parcours dans la même opération.
    try {
      const res = await client.post('/matching/accept', { proposalId });
      if (!res.data?.success) {
        if (res.data?.code === 'NO_CREDIT') {
          await refreshCredits();
          setOverlayMode('no_credit');
          return;
        }
        closeOverlay();
        Alert.alert('Match', res.data?.message || 'Cette invitation n\'est plus valide.');
        await refreshCredits();
        initScreen(true);
        return;
      }
      await refreshCredits();
      const matchRes = await client.get('/matching/my-matches');
      const live = (matchRes.data ?? []).find((m: ActiveMatch) => !m.ended);
      if (live) setActiveMatch(live);
      soundService.playMatchCelebration();
      setOverlayMode('success');
      initScreen(true);
    } catch (error) {
      closeOverlay();
      Alert.alert('Match impossible', getReadableError(error));
    } finally {
      setAcceptingProposal(null);
      setConnecting(false);
    }
  };

  // Décliner une invitation reçue : l'auteur récupère son crédit.
  const handleDeclineLike = (proposalId: string, likeName: string) => {
    const run = async () => {
      setAnsweringProposal(proposalId);
      try {
        const res = await client.post('/matching/decline', { proposalId });
        if (!res.data?.success) {
          Alert.alert('Invitation', res.data?.message || 'Cette invitation n\'est plus valide.');
        }
      } catch (error) {
        Alert.alert('Invitation', getReadableError(error));
      } finally {
        setAnsweringProposal(null);
        initScreen(true);
      }
    };
    confirmAction(
      'Décliner cette invitation ?',
      `${likeName} ne sera pas prévenu(e) de votre choix ; son crédit lui sera rendu.`,
      'Décliner',
      run,
    );
  };

  // Retirer son invitation tant qu'elle n'est pas acceptée : crédit rendu.
  const handleCancelInvite = (proposalId: string, name: string) => {
    const run = async () => {
      setAnsweringProposal(proposalId);
      try {
        const res = await client.post('/matching/cancel', { proposalId });
        if (!res.data?.success) {
          Alert.alert('Invitation', res.data?.message || 'Cette invitation n\'est plus valide.');
        }
        await refreshCredits();
      } catch (error) {
        Alert.alert('Invitation', getReadableError(error));
      } finally {
        setAnsweringProposal(null);
        initScreen(true);
      }
    };
    confirmAction(
      'Retirer votre invitation ?',
      `Votre invitation à ${name} sera retirée et votre crédit vous sera rendu.`,
      'Retirer',
      run,
    );
  };

  const handleNext = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.timing(cardFade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setProfileIndex(i => {
        const total = Math.max(1, profiles.length);
        return (i + 1) % total;
      });
    });
  };

  const handlePrev = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.timing(cardFade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setProfileIndex(i => {
        const total = Math.max(1, profiles.length);
        return (i - 1 + total) % total;
      });
    });
  };

  const handlePass = handleNext;



  if (!loading && !activeMatch && profiles.length === 0 && receivedLikes.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>Découverte</Text>
            <Text style={styles.headerSub}>Profils compatibles pour vous</Text>
          </View>
          <TouchableOpacity style={styles.creditsBadge} onPress={() => router.push('/onboarding/payment')} activeOpacity={0.8}>
            <Heart size={13} color={Colors.primary.red} fill={Colors.primary.red} />
            <Text style={styles.creditsText}>{credits} crédits</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyWrap}>
          <LinearGradient colors={[Colors.primary.red + '12', Colors.primary.purple + '10']} style={styles.emptyCircle}>
            <Sparkles size={44} color={Colors.primary.red} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Tout est à jour !</Text>
          <Text style={styles.emptyDesc}>Nos algorithmes préparent de nouveaux profils compatibles pour vous.</Text>
          <TouchableOpacity onPress={() => initScreen()} activeOpacity={0.85} style={styles.refreshWrap}>
            <LinearGradient colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.refreshBtn}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.refreshText}>Actualiser</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />

      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Découverte</Text>
          <Text style={styles.headerSub}>
            {activeMatch ? 'Votre match en cours' : 'Profils compatibles pour vous'}
          </Text>
        </View>
        <TouchableOpacity style={styles.creditsBadge} onPress={() => router.push('/onboarding/payment')} activeOpacity={0.8}>
          <Heart size={13} color={Colors.primary.red} fill={Colors.primary.red} />
          <Text style={styles.creditsText}>{credits} crédits</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {loading && (
          <DiscoverSkeleton pulseAnim={pulseAnim} />
        )}

        {!loading && receivedLikes.length > 0 && !activeMatch && (
          <View style={styles.likesSection}>
            <Text style={styles.likesTitle}>💕 Personnes qui vous ont liké</Text>
            {receivedLikes.map((like) => (
              <View key={like.id}>
              <TouchableOpacity onPress={() => handleAcceptLike(like.id, like.name)} activeOpacity={0.85} style={styles.likeCard}>
                <LinearGradient colors={[Colors.primary.red + '08', Colors.primary.purple + '06']} style={styles.likeCardGrad}>
                  <View style={styles.likeAvatar}>
                    <Text style={styles.likeAvatarText}>{like.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.likeInfo}>
                    <Text style={styles.likeName}>{like.name}</Text>
                    <Text style={styles.likeProfession}>{like.profession}</Text>
                    <Text style={styles.likeCompat}>{like.compatibility}% de compatibilité</Text>
                  </View>
                  <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.acceptBtn}>
                    <Heart size={14} color="#fff" fill="#fff" />
                    <Text style={styles.acceptBtnText}>Accepter</Text>
                  </LinearGradient>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeclineLike(like.id, like.name)}
                disabled={answeringProposal === like.id}
                activeOpacity={0.7}
                style={styles.declineLink}
                testID="discover-decline-like"
              >
                <Text style={styles.declineLinkText}>Décliner</Text>
              </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {!loading && (activeMatch || profiles.length > 0) && currentMatch && (
          <Animated.View
            style={[
              styles.profileCard,
              { opacity: cardFade, transform: [{ translateY: cardSlide }] },
            ]}
          >
            {/* ── Grande carte anonyme ────────────── */}
            <View style={styles.bigCard}>
              {/* Halos de fond colorés */}
              <View style={[styles.halo, { top: -60, right: -60, backgroundColor: Colors.primary.red + '07' }]} />
              <View style={[styles.halo, { bottom: -40, left: -40, backgroundColor: Colors.primary.purple + '06' }]} />
              <View style={[styles.halo, { bottom: 40, right: -20, width: 100, height: 100, backgroundColor: Colors.primary.orange + '06' }]} />

              {/* Badge compatibilité */}
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.compatBadge}
              >
                <Sparkles size={12} color="#fff" />
                <Text style={styles.compatText}>{currentMatch.compatibilityLabel || 'Compatibilité BOLIGO'}</Text>
              </LinearGradient>

              {/* Cercle de score : le vrai pourcentage global */}
              <View style={styles.avatarWrapper}>
                <ScoreRing percent={currentMatch.compatibility} color={scoreColor(currentMatch.compatibility)} />
              </View>

              {/* Footer de la grande carte : Nom + Slogan */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']}
                style={styles.cardFooter}
              >
                <Text style={styles.cardTitle}>{currentMatch.firstName}</Text>
                
                {/* Badges de localisation, âge, profession sous le nom */}
                <View style={styles.profileBadgesRow}>
                  {typeof currentMatch.age === 'number' && currentMatch.age > 0 ? <Text style={styles.profileBadge}>{currentMatch.age} ans</Text> : null}
                  {!!currentMatch.location && <Text style={styles.profileBadge}>{currentMatch.location}</Text>}
                  {!!currentMatch.profession && <Text style={styles.profileBadge}>{currentMatch.profession}</Text>}
                  {!!currentMatch.distance && <Text style={styles.profileBadge}>{currentMatch.distance}</Text>}
                </View>

                {!!currentMatch.slogan && (
                <View style={styles.sloganBox}>
                  <Text style={styles.sloganQuote}>«</Text>
                  <Text style={styles.sloganText}>{currentMatch.slogan}</Text>
                  <Text style={styles.sloganQuote}>»</Text>
                </View>
                )}
              </LinearGradient>
            </View>

            <View style={styles.mainContent}>

              {/* 4. Analyse Boligo */}
              {!!currentMatch.aiAnalysis && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>🧠</Text></View>
                  <Text style={styles.sectionTitle}>ANALYSE BOLIGO</Text>
                </View>
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisText}>{renderFormattedText(currentMatch.aiAnalysis)}</Text>
                </View>
              </View>
              )}

              {/* 5. Affinités par module du Grand Entretien */}
              {currentMatch.mentalMap.length > 0 && (
              <View style={styles.sectionBlock} testID="discover-modules">
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>📊</Text></View>
                  <Text style={styles.sectionTitle}>AFFINITÉS PAR MODULE</Text>
                </View>
                <Text style={styles.modulesIntro}>
                  Calculées en comparant vos réponses au Grand Entretien, module par module.
                </Text>
                <View style={styles.modulesCard}>
                  {currentMatch.mentalMap.map((p, i) => (
                    <PillarRow key={p.id} pillar={p} delay={i * 80} />
                  ))}
                </View>
              </View>
              )}

              {/* 6. Pourquoi vous pourriez fonctionner */}
              {!!currentMatch.positivePoints?.length && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}><Link2 size={16} color="#10B981" /></View>
                  <Text style={styles.sectionTitle}>POURQUOI VOUS POURRIEZ FONCTIONNER</Text>
                </View>
                <View style={{ gap: Spacing.sm }}>
                  {currentMatch.positivePoints.map((pt, i) => (
                    <View key={i} style={styles.positiveCard}>
                      <View style={styles.positiveDot} />
                      <Text style={styles.positiveText}>{renderFormattedText(pt)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              )}

              {/* 7. Point de vigilance */}
              {!!currentMatch.warningPoint && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#F59E0B15' }]}><Text style={{fontSize:15}}>⚖️</Text></View>
                  <Text style={styles.sectionTitle}>POINT DE VIGILANCE</Text>
                </View>
                <View style={styles.warningCard}>
                  <View style={styles.warningHeader}>
                    <AlertTriangle size={16} color="#F59E0B" />
                    <Text style={styles.warningTitle}>À ABORDER ENSEMBLE</Text>
                  </View>
                  <Text style={styles.warningText}>{renderFormattedText(currentMatch.warningPoint)}</Text>
                </View>
              </View>
              )}

              {/* 7bis. Sujets à aborder (divergences → dialogue, pas de swipe) */}
              {discussionTopics.length > 0 && (
              <View style={styles.sectionBlock} testID="discussion-topics">
                <View style={styles.sectionHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#6366F115' }]}><Text style={{fontSize:15}}>💬</Text></View>
                  <Text style={styles.sectionTitle}>SUJETS À ABORDER</Text>
                </View>
                <Text style={styles.topicsIntro}>
                  {majorDivergence
                    ? `Vos profils divergent nettement sur ${discussionTopics.length > 1 ? 'ces points' : 'ce point'}. BOLIGO ne cache pas les différences : parlez-en franchement dès le Sondeur.`
                    : 'Quelques différences à explorer ensemble pendant les 3 jours du Sondeur.'}
                </Text>
                <View style={{ gap: Spacing.sm }}>
                  {discussionTopics.map((topic) => (
                    <View key={topic.id} style={styles.topicCard}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <Text style={styles.topicPrompt}>{topic.prompt}</Text>
                    </View>
                  ))}
                </View>
              </View>
              )}

              {/* 8. Profil Details Grid */}
              {currentMatch.details && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>👤</Text></View>
                  <Text style={styles.sectionTitle}>PROFIL</Text>
                </View>
                <View style={styles.detailsGrid}>
                  {Object.entries(currentMatch.details)
                    .filter(([key, val]) => !!DETAIL_LABELS[key] && typeof val === 'string' && val.length > 0)
                    .map(([key, val]) => (
                      <View key={key} style={styles.detailBox}>
                        <View style={styles.detailBoxHeader}>
                          <Text style={{ fontSize: 13 }}>{DETAIL_LABELS[key].emoji}</Text>
                          <Text style={styles.detailBoxLabel}>{DETAIL_LABELS[key].label.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.detailBoxVal}>{val}</Text>
                      </View>
                    ))}
                </View>
              </View>
              )}

              {/* 9. Valeurs & Centres d'intérêt */}
              {currentMatch.interests && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>✨</Text></View>
                  <Text style={styles.sectionTitle}>VALEURS & CENTRES D'INTÉRÊT</Text>
                </View>
                <View style={styles.chipsWrap}>
                  {currentMatch.interests.map((int, i) => (
                    <View key={i} style={[styles.chip, int.common && styles.chipCommon]}>
                      {int.common && <Sparkles size={12} color={Colors.primary.red} />}
                      <Text style={[styles.chipText, int.common && styles.chipTextCommon]}>{int.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.legendRow}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>En commun</Text>
                  <View style={[styles.legendDot, { backgroundColor: Colors.neutral.border }]} />
                  <Text style={styles.legendText}>{currentMatch.pronoun === 'elle' ? 'Ses valeurs à elle' : currentMatch.pronoun === 'il' ? 'Ses valeurs à lui' : 'Ses valeurs'}</Text>
                </View>
              </View>
              )}

              {/* 10. Ce profil en 3 mots */}
              {currentMatch.threeWords && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>🏷️</Text></View>
                  <Text style={styles.sectionTitle}>CE PROFIL EN 3 MOTS</Text>
                </View>
                <View style={styles.threeWordsRow}>
                  {currentMatch.threeWords.map((word, i) => (
                    <View key={i} style={styles.wordCard}>
                      <Text style={styles.wordText}>{word}</Text>
                    </View>
                  ))}
                </View>
              </View>
              )}

              {/* 11. Ce qu'elle attend vraiment */}
              {currentMatch.expectations && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>🎯</Text></View>
                  <Text style={styles.sectionTitle}>
                    {currentMatch.pronoun === 'elle' ? "CE QU'ELLE ATTEND VRAIMENT" : currentMatch.pronoun === 'il' ? "CE QU'IL ATTEND VRAIMENT" : 'SES ATTENTES'}
                  </Text>
                </View>
                <View style={{ gap: Spacing.sm }}>
                  {currentMatch.expectations.map((exp, i) => (
                    <View key={i} style={styles.expectationCard}>
                      <Text style={styles.expectationIcon}>{exp.icon}</Text>
                      <Text style={styles.expectationText}>{renderFormattedText(exp.text)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              )}

              {/* ── Actions / Boutons ──────────────────────────────────────────── */}
              <View style={styles.actionsWrap}>
                {activeMatch ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (activeMatch.phase === 'attente') return;
                      if (activeMatch.phase === 'sondeur') router.push('/(tabs)');
                      else if (activeMatch.phase === 'chat') router.push('/(tabs)/messages');
                      else if (activeMatch.phase === 'video') router.push({ pathname: '/video-call', params: { name: activeMatch.name, avatar: (activeMatch?.name || "?").charAt(0), journeyId: activeMatch.journeyId || '' } });
                      else router.push('/(tabs)/messages');
                    }}
                    activeOpacity={0.85}
                    style={styles.likeBtnWrap}
                  >
                    <LinearGradient
                      colors={activeMatch.phase === 'attente' ? ['#E5E7EB', '#9CA3AF'] : ['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.likeBtn}
                    >
                      {activeMatch.phase === 'attente' ? <RefreshCw size={17} color="#fff" /> : <Sparkles size={17} color="#fff" />}
                      <Text style={styles.likeBtnText}>
                        {activeMatch.phase === 'attente' && 'En attente de réponse'}
                        {activeMatch.phase === 'sondeur' && 'Répondre aux questions'}
                        {activeMatch.phase === 'chat' && 'Ouvrir le chat'}
                        {activeMatch.phase === 'video' && 'Appel vidéo'}
                        {activeMatch.phase === 'contacts' && 'Échanger les contacts'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : null}
                {activeMatch?.phase === 'attente' && activeMatch.proposalId ? (
                  <TouchableOpacity
                    onPress={() => handleCancelInvite(activeMatch.proposalId!, activeMatch.name)}
                    disabled={answeringProposal === activeMatch.proposalId}
                    activeOpacity={0.7}
                    style={styles.passBtn}
                    testID="discover-cancel-invite"
                  >
                    <Text style={styles.passBtnText}>Retirer mon invitation (crédit rendu)</Text>
                  </TouchableOpacity>
                ) : null}
                {activeMatch ? null : (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        if (credits < 1) {
                          setAcceptingProposal(null);
                          openOverlay('no_credit');
                          return;
                        }
                        if (hasLikedMe && existingLike) {
                          setAcceptingProposal({ id: existingLike.id, name: existingLike.name ?? existingLike.firstName ?? currentMatch.firstName });
                        } else {
                          setAcceptingProposal(null);
                        }
                        openOverlay('connect');
                      }}
                      testID="discover-like"
                      activeOpacity={0.85}
                      style={styles.likeBtnWrap}
                    >
                      <LinearGradient
                        colors={hasLikedMe ? ['#10B981', '#059669'] : [Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.likeBtn}
                      >
                        {hasLikedMe ? <Sparkles size={17} color="#fff" /> : <Heart size={17} color="#fff" fill="#fff" />}
                        <Text style={styles.likeBtnText}>
                          {hasLikedMe ? 'Accepter ce profil' : "J'aime ce profil"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {!hasLikedMe && (
                      <TouchableOpacity onPress={handlePass} activeOpacity={0.7} style={styles.passBtn}>
                        <Text style={styles.passBtnText}>Continuer à explorer</Text>
                        <ChevronRight size={15} color={Colors.text.primary40} />
                      </TouchableOpacity>
                    )}
                    {hasLikedMe && existingLike && (
                      <TouchableOpacity
                        onPress={() => handleDeclineLike(existingLike.id, existingLike.name ?? currentMatch.firstName)}
                        disabled={answeringProposal === existingLike.id}
                        activeOpacity={0.7}
                        style={styles.passBtn}
                      >
                        <Text style={styles.passBtnText}>Décliner l'invitation</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
              <View style={{ height: 40 }} />
            </View>
          </Animated.View>
        )}

        {!loading && !activeMatch && profiles.length === 0 && receivedLikes.length === 0 && (
          <View style={styles.emptyWrap}>
            <LinearGradient colors={[Colors.primary.red + '15', Colors.primary.purple + '10']} style={styles.emptyCircle}>
              <Sparkles size={40} color={Colors.primary.red} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Aucun profil disponible</Text>
            <Text style={styles.emptyDesc}>
              La base de données ne contient aucun profil actif pour le moment. Soyez le premier membre à vous inscrire et compléter votre entretien !
            </Text>
            <TouchableOpacity style={styles.refreshWrap} onPress={() => initScreen()} activeOpacity={0.8}>
              <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.refreshBtn}>
                <RefreshCw size={16} color="#fff" />
                <Text style={styles.refreshText}>Actualiser</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Flèches de navigation FIXES (Défiler les profils : Précédent ‹ / Suivant ›) ── */}
      {!loading && (activeMatch || profiles.length > 0) && currentMatch && !activeMatch && (
        <>
          {/* Flèche gauche — Profil précédent */}
          <TouchableOpacity
            onPress={handlePrev}
            style={styles.fixedArrowBtnLeft}
            activeOpacity={0.75}
          >
            <ChevronLeft size={26} color={Colors.text.primary70} />
          </TouchableOpacity>

          {/* Flèche droite — Profil suivant */}
          <TouchableOpacity
            onPress={handleNext}
            style={styles.fixedArrowBtnRight}
            activeOpacity={0.75}
          >
            <ChevronRight size={26} color={Colors.text.primary70} />
          </TouchableOpacity>
        </>
      )}

      {/* OVERLAYS */}
      {overlayMode !== 'none' && (
        <Animated.View style={[styles.overlayBackdrop, { opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !connecting && closeOverlay()} />
          <Animated.View style={[styles.sheet, overlayMode === 'success' && styles.successSheet, { transform: [{ translateY: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] }]}>
            <View style={styles.sheetHandle} />

            {/* 1. Connect Confirmation Mode */}
            {overlayMode === 'connect' && currentMatch && (
              <>
                <Text style={styles.sheetTitle}>Souhaitez-vous découvrir {currentMatch.firstName} ?</Text>
                <Text style={styles.sheetDesc}>En confirmant, vous manifestez votre intérêt. Vos identités complètes seront révélées mutuellement.</Text>
                <View style={styles.costRow}>
                  <Heart size={13} color={Colors.primary.red} fill={Colors.primary.red} />
                  <Text style={styles.costText}>1 crédit sera utilisé</Text>
                  <Text style={styles.costBalance}>({credits} disponibles)</Text>
                </View>
                <View style={styles.sheetBtns}>
                  <TouchableOpacity disabled={connecting} onPress={closeOverlay} style={[styles.btnSec, connecting && { opacity: 0.5 }]}><Text style={styles.btnSecText}>Annuler</Text></TouchableOpacity>
                  <TouchableOpacity disabled={connecting} onPress={handleConnect} activeOpacity={0.85} style={[styles.btnPriWrap, connecting && { opacity: 0.7 }]}>
                    <LinearGradient colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnPri}>
                      {connecting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.btnPriText}>Confirmer</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* 2. No Credit Mode */}
            {overlayMode === 'no_credit' && (
              <>
                <View style={styles.noCreditCircle}><Heart size={30} color={Colors.primary.red} /></View>
                <Text style={styles.sheetTitle}>Plus de crédits disponibles</Text>
                <Text style={styles.sheetDesc}>Rechargez vos crédits pour vous connecter avec de nouveaux profils.</Text>
                <View style={styles.sheetBtns}>
                  <TouchableOpacity onPress={closeOverlay} style={styles.btnSec}><Text style={styles.btnSecText}>Plus tard</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => { closeOverlay(); router.push('/onboarding/payment'); }} activeOpacity={0.85} style={styles.btnPriWrap}>
                    <LinearGradient colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnPri}><Text style={styles.btnPriText}>Recharger</Text></LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* 3. Success Mode */}
            {overlayMode === 'success' && currentMatch && (
              <>
                <LinearGradient colors={[Colors.primary.red + '15', Colors.primary.purple + '12']} style={styles.successCircle}>
                  <Text style={{ fontSize: 44 }}>✨</Text>
                </LinearGradient>
                <Text style={styles.sheetTitle}>Connexion établie !</Text>
                <Text style={styles.sheetDesc}>{currentMatch.firstName} et vous pouvez maintenant vous découvrir mutuellement. Bonne conversation !</Text>
                <TouchableOpacity onPress={() => { closeOverlay(); initScreen(); }} activeOpacity={0.85} style={[styles.btnPriWrap, { width: '100%' }]}>
                  <LinearGradient colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnPri}>
                    <Text style={styles.btnPriText}>Commencer le parcours</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.backgroundLight },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1, borderBottomColor: Colors.neutral.border,
  },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 24, color: Colors.text.primary100 },
  headerSub: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.text.primary40, marginTop: 2 },
  creditsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary.red + '10',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  creditsText: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: Colors.primary.red },

  scrollContent: { paddingBottom: 60 },
  profileCard: { flex: 1 },
  
  // RESTORED BIG CARD STYLES
  bigCard: {
    margin: Spacing.lg,
    minHeight: SCREEN_HEIGHT * 0.45, // Using minHeight for responsiveness
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  avatarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80, // Space for the top compatibility badge
    paddingBottom: 20,
  },
  halo: {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: 100,
  },
  compatBadge: {
    position: 'absolute',
    top: Spacing.lg,
    alignSelf: 'center', // Center badge horizontally
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    zIndex: 20,
  },
  compatText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: '#fff',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInitial: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 28,
    color: '#fff',
  },
  declineLink: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: -4,
    marginBottom: 6,
  },
  declineLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary40,
  },
  cardFooter: {
    width: '100%',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 24,
    color: Colors.text.primary100,
  },
  profileBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm, justifyContent: 'center' },
  profileBadge: {
    fontFamily: Typography.fontFamily.medium, fontSize: 11,
    color: Colors.text.primary70, backgroundColor: Colors.neutral.white,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  sloganBox: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sloganQuote: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 24,
    color: Colors.primary.red,
    lineHeight: 28,
  },
  sloganText: {
    fontFamily: Typography.fontFamily.serif,
    fontStyle: 'italic',
    fontSize: 15,
    color: Colors.text.primary70,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    flex: 1,
  },

  mainContent: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },

  // Sections Génériques
  sectionBlock: { gap: Spacing.sm },
  topicsIntro: { fontFamily: Typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: Colors.text.primary70, marginBottom: 2 },
  topicCard: { padding: 14, borderRadius: 16, backgroundColor: '#6366F10D', borderWidth: 1, borderColor: '#6366F126', gap: 4 },
  topicTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 14, color: Colors.text.primary100 },
  topicPrompt: { fontFamily: Typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: Colors.text.primary70 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  iconCircle: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.neutral.border,
    alignItems: 'center', justifyContent: 'center'
  },
  sectionTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: Colors.text.primary100, letterSpacing: 1 },

  // 4. Analyse
  analysisCard: {
    backgroundColor: Colors.neutral.white, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  analysisText: { fontFamily: Typography.fontFamily.regular, fontSize: 15, color: Colors.text.primary70, lineHeight: 24 },

  // 5. Piliers
  modulesCard: {
    backgroundColor: Colors.neutral.white, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.neutral.border, gap: Spacing.lg,
  },
  pillarRow: { gap: 6 },
  pillarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarLabel: { fontFamily: Typography.fontFamily.bold, fontSize: 13, color: Colors.text.primary100 },
  pillarVal: { fontFamily: Typography.fontFamily.medium, fontSize: 12 },
  pillarTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.neutral.border, overflow: 'hidden' },
  pillarFill: { height: '100%', borderRadius: 3 },
  pillarVerdict: { fontFamily: Typography.fontFamily.regular, fontSize: 12, lineHeight: 17, color: Colors.text.primary70 },
  modulesIntro: { fontFamily: Typography.fontFamily.regular, fontSize: 12.5, lineHeight: 18, color: Colors.text.primary70, marginBottom: Spacing.sm },
  scoreRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scoreRingValue: { fontFamily: Typography.fontFamily.bold, fontSize: 30, lineHeight: 34 },
  scoreRingPercent: { fontFamily: Typography.fontFamily.bold, fontSize: 16 },
  scoreRingCaption: { fontFamily: Typography.fontFamily.medium, fontSize: 11, color: Colors.text.primary70, marginTop: 1 },

  // 6. Pourquoi ça marche
  positiveCard: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: '#10B98110', borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: '#10B98130',
  },
  positiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginTop: 8 },
  positiveText: { flex: 1, fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary100, lineHeight: 22 },

  // 7. Vigilance
  warningCard: {
    backgroundColor: '#FFF0F2', borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: '#FFE4E6', gap: 6,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warningTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 11, color: '#F59E0B', letterSpacing: 0.5 },
  warningText: { fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary70, lineHeight: 22 },

  // 8. Détails Grid
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  detailBox: {
    width: '48%',
    backgroundColor: '#FFF8F9',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 4,
  },
  detailBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailBoxLabel: { fontFamily: Typography.fontFamily.bold, fontSize: 9, color: Colors.text.primary40, letterSpacing: 0.5 },
  detailBoxVal: { fontFamily: Typography.fontFamily.bold, fontSize: 13, color: Colors.text.primary100 },

  // 9. Chips / Valeurs
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.neutral.white, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.neutral.border,
  },
  chipCommon: { borderColor: Colors.primary.red, backgroundColor: Colors.primary.red + '05' },
  chipText: { fontFamily: Typography.fontFamily.medium, fontSize: 13, color: Colors.text.primary70 },
  chipTextCommon: { color: Colors.primary.red },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary.red },
  legendText: { fontFamily: Typography.fontFamily.medium, fontSize: 11, color: Colors.text.primary40, marginRight: Spacing.md },

  // 10. 3 Mots
  threeWordsRow: { flexDirection: 'row', gap: Spacing.sm },
  wordCard: {
    flex: 1, backgroundColor: Colors.neutral.white, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  wordText: { fontFamily: Typography.fontFamily.serif, fontStyle: 'italic', fontSize: 15, color: '#D4AF37', fontWeight: 'bold' },

  // 11. Attentes
  expectationCard: {
    flexDirection: 'row', gap: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.neutral.white, borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  expectationIcon: { fontSize: 24 },
  expectationText: { flex: 1, fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary100, lineHeight: 22 },

  // --- REST OF ORIGINAL STYLES ---
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontFamily: Typography.fontFamily.medium, fontSize: 14, color: Colors.text.primary40 },

  actionsWrap: { gap: Spacing.md, marginTop: Spacing.xl },
  likeBtnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  likeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 16, borderRadius: BorderRadius.lg,
  },
  likeBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#fff',
  },
  passBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.md },
  passBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: 14, color: Colors.text.primary40 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 22, color: Colors.text.primary100, marginBottom: Spacing.sm, textAlign: 'center' },
  emptyDesc: { fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary70, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  refreshWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: BorderRadius.lg },
  refreshText: { fontFamily: Typography.fontFamily.medium, fontSize: 14, color: '#fff' },

  likesSection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, backgroundColor: Colors.neutral.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  likesTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.text.primary100, marginBottom: Spacing.md },
  likeCard: { marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  likeCardGrad: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  likeAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary.red, alignItems: 'center', justifyContent: 'center' },
  likeAvatarText: { fontFamily: Typography.fontFamily.bold, fontSize: 20, color: '#fff' },
  likeInfo: { flex: 1, gap: 2 },
  likeName: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: Colors.text.primary100 },
  likeProfession: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.text.primary70 },
  likeCompat: { fontFamily: Typography.fontFamily.medium, fontSize: 11, color: Colors.primary.red },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full },
  acceptBtnText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: '#fff' },

  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheet: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: BorderRadius.xl * 2,
    borderTopRightRadius: BorderRadius.xl * 2,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
  },
  successSheet: { alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.neutral.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.xl },
  sheetTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 22, color: Colors.text.primary100, marginBottom: Spacing.sm },
  sheetDesc: { fontFamily: Typography.fontFamily.regular, fontSize: 15, color: Colors.text.primary70, lineHeight: 23, marginBottom: Spacing.lg },
  costRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary.red + '08',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, marginBottom: Spacing.xl, alignSelf: 'flex-start',
  },
  costText: { fontFamily: Typography.fontFamily.medium, fontSize: 13, color: Colors.primary.red },
  costBalance: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.text.primary40 },
  sheetBtns: { flexDirection: 'row', gap: Spacing.md },
  btnSec: {
    flex: 1, paddingVertical: 15, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.neutral.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecText: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: Colors.text.primary70 },
  btnPriWrap: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btnPri: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnPriText: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: '#fff' },
  noCreditCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary.red + '10', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.lg },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },

  // Styles pour le squelette de chargement
  skeletonContainer: {
    paddingBottom: 40,
  },
  skeletonCard: {
    margin: Spacing.lg,
    height: SCREEN_HEIGHT * 0.45,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
  },
  skeletonCompatBadge: {
    width: 140,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.border,
  },
  skeletonAvatarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  skeletonAvatarCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.neutral.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  skeletonCardFooter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  skeletonTextLine: {
    backgroundColor: Colors.neutral.border,
    borderRadius: 4,
  },
  skeletonBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.md,
  },
  skeletonBadge: {
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral.border,
  },
  skeletonSloganBox: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  skeletonLoadingText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.text.primary40,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  skeletonContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  skeletonSection: {
    gap: Spacing.sm,
  },
  skeletonSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  skeletonIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.neutral.border,
  },
  skeletonAnalysisCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 30,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  likeIndicator: {
    left: 24,
    backgroundColor: '#10B981',
    transform: [{ rotate: '-12deg' }],
  },
  passIndicator: {
    right: 24,
    backgroundColor: '#EF4444',
    transform: [{ rotate: '12deg' }],
  },
  swipeIndicatorText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  fixedArrowBtnLeft: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -24 }],
    left: 10,
    zIndex: 99,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  fixedArrowBtnRight: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -24 }],
    right: 10,
    zIndex: 99,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
});