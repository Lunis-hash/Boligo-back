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
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Heart, Sparkles, ChevronRight, ChevronLeft, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Link2 } from 'lucide-react-native';
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
  details?: {
    situation: string;
    children: string;
    religion: string;
    education: string;
    lifestyle: string;
  };
  interests?: { label: string; common: boolean }[];
  threeWords?: string[];
  expectations?: { icon: string; text: string }[];
  mentalMap: {
    id: string;
    label: string;
    emoji: string;
    value: number;
    color: string;
  }[];
}

interface ActiveMatch {
  id: string;
  name: string;
  compatibility: number;
  profession: string;
  location: string;
  phase: string;
  journeyId: string | null;
  slogan?: string;
  mentalMap?: MatchProfile['mentalMap'];
  aiAnalysis?: string;
  positivePoints?: string[];
  warningPoint?: string;
  details?: MatchProfile['details'];
  interests?: MatchProfile['interests'];
  threeWords?: MatchProfile['threeWords'];
  expectations?: MatchProfile['expectations'];
}

// ─── Données mock enrichies "Mental Map V2" ────────────────────
const FALLBACK_PROFILES: MatchProfile[] = [
  {
    id: '1',
    firstName: 'Amélie G.',
    age: 32,
    location: 'Lyon',
    distance: '~460 km',
    profession: 'Ingénieure',
    compatibility: 80,
    slogan: "Je cherche quelqu'un avec qui construire quelque chose de vrai — pas juste une belle histoire. La vie à deux, ça se mérite et ça se choisit chaque jour.",
    aiAnalysis: "Amélie est une personne **profondément ancrée dans ses valeurs**, qui place la loyauté et la communication au cœur de sa vision du couple. Elle envisage la **famille comme une priorité à moyen terme** et cherche un partenaire qui partage cette orientation sans pression. Son rapport à la foi est discret mais structurant — elle ne l'impose pas, mais elle y tient. Dans sa vie quotidienne, elle **allie vie professionnelle exigeante et besoin de calme à la maison**, ce qui en fait quelqu'un de fiable et de posé.",
    positivePoints: [
      "Vous partagez **la même vision de la famille** — enfants envisagés dans une temporalité similaire et importance accordée à l'éducation.",
      "**Votre rapport à la foi** est complémentaire : croyance personnelle sans prosélytisme pour tous les deux.",
      "Vous valorisez tous les deux **la communication directe** et la résolution pacifique des conflits."
    ],
    warningPoint: "Vos **attentes sur le rythme de vie** diffèrent légèrement : Amélie privilégie les soirées calmes à la maison, là où votre profil indique une préférence pour des sorties plus régulières. Ce n'est pas un obstacle, mais ça mérite une conversation.",
    details: {
      situation: 'Célibataire',
      children: 'Souhaite en avoir',
      religion: 'Chrétienne pratiquante',
      education: 'Bac +5',
      lifestyle: 'Urbain, sédentaire'
    },
    interests: [
      { label: 'Famille', common: true },
      { label: 'Foi & spiritualité', common: true },
      { label: 'Honnêteté', common: true },
      { label: 'Projets de vie', common: false },
      { label: 'Cuisine', common: false },
      { label: 'Développement personnel', common: true },
      { label: 'Lecture', common: false },
      { label: 'Cinéma', common: false },
    ],
    threeWords: ['Ancrée', 'Directe', 'Bâtisseuse'],
    expectations: [
      { icon: '⏱️', text: "Un engagement concret envisagé **dans les 2 ans**, pas une relation sans horizon." },
      { icon: '🤝', text: "Un partenaire **disponible émotionnellement** — capable d'écouter sans fuir les conversations difficiles." },
      { icon: '🏡', text: "Un foyer stable, pas forcément parfait — mais **construit à deux**." }
    ],
    mentalMap: [
      { id: 'valeurs', label: 'Valeurs & croyances', emoji: '💎', value: 92, color: '#10B981' },
      { id: 'projet', label: 'Projet de vie', emoji: '🌱', value: 87, color: '#10B981' },
      { id: 'com', label: 'Communication dans le couple', emoji: '💬', value: 80, color: '#F59E0B' },
      { id: 'foyer', label: 'Finances & gestion du foyer', emoji: '💰', value: 74, color: '#F59E0B' },
      { id: 'sexe', label: 'Sexualité & intimité', emoji: '🔥', value: 61, color: '#EF4444' },
    ],
  },
  {
    id: '2',
    firstName: 'Thomas D.',
    age: 29,
    location: 'Paris',
    distance: '~5 km',
    profession: 'Architecte',
    compatibility: 88,
    slogan: 'Construire quelque chose de durable, ensemble.',
    aiAnalysis: "Thomas est un profil **très orienté projet**. Il aime structurer son avenir tout en gardant une place importante pour la **spontanéité et la découverte**. Très attaché à l'équilibre vie pro / vie perso.",
    positivePoints: [
      "Vous partagez une **vision commune sur les projets d'avenir** et la construction d'un foyer stable.",
      "**L'équilibre financier** semble très aligné entre vous deux."
    ],
    details: {
      situation: 'Célibataire',
      children: 'Ne sait pas encore',
      religion: 'Agnostique',
      education: 'Bac +5',
      lifestyle: 'Urbain, très actif'
    },
    interests: [
      { label: 'Entrepreneuriat & Projets', common: true },
      { label: 'Sport', common: true },
      { label: 'Art & Design', common: false },
    ],
    threeWords: ['Créatif', 'Structuré', 'Bâtisseur'],
    expectations: [
      { icon: '🏡', text: "Un/une partenaire de vie pour **construire un avenir solide** et s'élever mutuellement." },
      { icon: '⚖️', text: "Une relation basée sur **l'égalité et le partage des tâches**." }
    ],
    mentalMap: [
      { id: 'valeurs', label: 'Valeurs & croyances', emoji: '💎', value: 90, color: '#10B981' },
      { id: 'projet', label: 'Projet de vie', emoji: '🌱', value: 92, color: '#10B981' },
      { id: 'com', label: 'Communication dans le couple', emoji: '💬', value: 88, color: '#10B981' },
      { id: 'foyer', label: 'Finances & gestion du foyer', emoji: '💰', value: 89, color: '#10B981' },
      { id: 'sexe', label: 'Sexualité & intimité', emoji: '🔥', value: 79, color: '#F59E0B' },
    ],
  },
];

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
function AnonymousAvatar({ initial }: { initial: string }) {
  const enterScale = useRef(new Animated.Value(0.82)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enterScale.setValue(0.82);
    enterOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(enterScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(enterOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [initial]);

  return (
    <Animated.View style={[styles.avatarContainer, { opacity: enterOpacity, transform: [{ scale: enterScale }] }]}>
      <PulsingRings />

      {/* Particules géométriques */}
      <FloatingParticle color={Colors.primary.red}    size={9}  delay={0}    style={{ top: -34, left: -26 }} />
      <FloatingParticle color={Colors.primary.purple} size={7}  delay={800}  style={{ top: -22, right: -28 }} />
      <FloatingParticle color={Colors.primary.orange} size={10} delay={1600} style={{ bottom: -30, left: -20 }} />
      <FloatingParticle color={Colors.primary.red}    size={6}  delay={400}  style={{ bottom: -24, right: -22 }} />

      {/* Cœur du cercle — initiale + dégradé */}
      <LinearGradient
        colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.avatarCore}
      >
        <Text style={styles.avatarInitial}>{initial}</Text>
      </LinearGradient>
      {/* Verified Badge */}
      <View style={styles.verifiedBadge}>
        <ShieldCheck size={14} color="#FFF" />
      </View>
    </Animated.View>
  );
}

function PillarRow({ pillar, delay }: { pillar: MatchProfile['mentalMap'][0]; delay: number }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: pillar.value / 100,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pillar.value, delay]);

  return (
    <View style={styles.pillarRow}>
      <View style={styles.pillarHeader}>
        <Text style={styles.pillarLabel}>{pillar.label}</Text>
        <Text style={[styles.pillarVal, { color: pillar.color }]}>{pillar.value}%</Text>
      </View>
      <View style={styles.pillarTrack}>
        <Animated.View
          style={[
            styles.pillarFill,
            {
              backgroundColor: pillar.color,
              width: barWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${pillar.value}%`],
              }),
            },
          ]}
        />
      </View>
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
  const { credits, spendCredit, refreshCredits } = useAppContext();

  const [profiles, setProfiles] = useState<MatchProfile[]>([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [overlayMode, setOverlayMode] = useState<'none' | 'connect' | 'no_credit' | 'success'>('none');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [acceptingProposal, setAcceptingProposal] = useState<{ id: string, name: string } | null>(null);

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

  // Helper pour dynamiser les textes de l'IA avec le VRAI prénom du profil affiché
  const formatAiText = (text: string | undefined, targetName: string): string => {
    if (!text) return '';
    const cleanName = targetName.split(' ')[0].trim() || 'Ce profil';
    return text
      .replace(/\bAmélie\b/g, cleanName)
      .replace(/\bThomas\b/g, cleanName);
  };

  const formatAiList = (list: string[] | undefined, targetName: string): string[] => {
    if (!list) return [];
    const cleanName = targetName.split(' ')[0].trim() || 'Ce profil';
    return list.map(item => item.replace(/\bAmélie\b/g, cleanName).replace(/\bThomas\b/g, cleanName));
  };

  // Construction du match courant — uniquement données réelles du backend
  const activeName = activeMatch?.name ?? 'Utilisateur';

  const currentMatch: MatchProfile | null = activeMatch
    ? {
      id: activeMatch.id,
      firstName: activeMatch.name,
      profession: activeMatch.profession,
      compatibility: activeMatch.compatibility,
      slogan: activeMatch.slogan || '',
      mentalMap: (activeMatch.mentalMap?.length ? activeMatch.mentalMap : [
        { id: 'valeurs', label: '💎 Valeurs & Culture', emoji: '💎', value: 82, color: '#10B981' },
        { id: 'attachement', label: '🤝 Attachement & Émotions', emoji: '🤝', value: 80, color: '#10B981' },
        { id: 'projet', label: '🌱 Projet de Vie & Famille', emoji: '🌱', value: 78, color: '#F59E0B' },
        { id: 'vecu', label: '⚖️ Vécu & Maturité', emoji: '⚖️', value: 75, color: '#F59E0B' },
        { id: 'mode_de_vie', label: '💼 Mode de vie & Finances', emoji: '💼', value: 72, color: '#EF4444' },
      ]),
      aiAnalysis: formatAiText(activeMatch.aiAnalysis, activeName),
      positivePoints: formatAiList(activeMatch.positivePoints, activeName),
      warningPoint: formatAiText(activeMatch.warningPoint, activeName),
      details: activeMatch.details,
      interests: activeMatch.interests,
      threeWords: activeMatch.threeWords,
      expectations: activeMatch.expectations,
    }
    : (receivedLikes.length > 0)
      ? {
        id: receivedLikes[0].userId,
        firstName: receivedLikes[0].firstName ?? receivedLikes[0].name ?? 'Utilisateur',
        profession: receivedLikes[0].profession || 'Profil qui vous a liké',
        compatibility: receivedLikes[0].compatibility || 0,
        slogan: receivedLikes[0].slogan || 'Cette personne a manifesté son intérêt.',
        mentalMap: receivedLikes[0].mentalMap?.length ? receivedLikes[0].mentalMap : FALLBACK_PROFILES[0].mentalMap,
        aiAnalysis: `L'IA a identifié une affinité mutuelle avec ${receivedLikes[0].firstName ?? 'ce profil'}. Vous pouvez démarrer l'expérience.`,
      }
      : profiles[profileIndex]
        ? {
          ...profiles[profileIndex],
          aiAnalysis: formatAiText(profiles[profileIndex].aiAnalysis, profiles[profileIndex].firstName),
          positivePoints: formatAiList(profiles[profileIndex].positivePoints, profiles[profileIndex].firstName),
          warningPoint: formatAiText(profiles[profileIndex].warningPoint, profiles[profileIndex].firstName),
        }
        : null;

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

      if (matches.length > 0) {
        setActiveMatch(matches[0]);
      } else {
        setActiveMatch(null);
      }

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
        realProfiles = fetchedProfiles.map((p: any, idx: number) => {
          const name = p.firstName ?? p.name ?? `Profil #${idx + 1}`;
          const compatScore = typeof p.compatibility === 'number' ? p.compatibility : Math.round((p.compatibilityScore ?? 0.75) * 100);

          return {
            id: p.id || `profile-${idx}`,
            firstName: name,
            age: p.age ?? (25 + (idx * 3) % 15),
            location: p.location ?? p.city ?? (idx % 2 === 0 ? 'Paris' : 'Lyon'),
            distance: undefined, // l'app ne géolocalise pas : aucune distance inventée
            profession: p.profession ?? p.job ?? (idx % 2 === 0 ? 'Architecte / Designer' : 'Cadre / Ingénieur(e)'),
            compatibility: compatScore,
            slogan: p.slogan ?? p.bio ?? `« Rechercher une belle complicité fondée sur la sincérité et le soutien à ${p.location ?? p.city ?? 'Lyon'}. »`,
            aiAnalysis: p.aiAnalysis ?? `${name} présente un profil structuré autour de l'écoute et du respect mutuel. L'analyse révèle un fort besoin de transparence et d'engagement.`,
            positivePoints: (Array.isArray(p.positivePoints) && p.positivePoints.length > 0) ? p.positivePoints : [
              `Compatibilité mesurée à **${compatScore}%** sur les priorités de vie.`,
              `Alignement fort sur la valeur de **transparence et d'écoute mutuelle**.`,
            ],
            warningPoint: p.warningPoint ?? `Vos rythmes de vie quotidiens méritent un échange direct pour s'harmoniser sereinement.`,
            discussionTopics: Array.isArray(p.discussionTopics) ? p.discussionTopics : undefined,
            hardStop: p.hardStop === true,
            details: p.details ?? {
              situation: 'Célibataire',
              children: idx % 2 === 0 ? 'Souhaite en avoir' : 'À discuter ensemble',
              religion: 'Spiritualité personnelle',
              education: 'Enseignement Supérieur (Bac +5)',
              lifestyle: idx % 2 === 0 ? 'Urbain, dynamique' : 'Calme, sédentaire'
            },
            interests: (Array.isArray(p.interests) && p.interests.length > 0) ? p.interests : [
              { label: 'Famille & Foyer', common: true },
              { label: 'Sincérité', common: true },
            ],
            threeWords: (Array.isArray(p.threeWords) && p.threeWords.length > 0) ? p.threeWords : ['Authentique', 'Sincère', 'Engagé(e)'],
            expectations: (Array.isArray(p.expectations) && p.expectations.length > 0) ? p.expectations : [
              { icon: '⏱️', text: `Une relation transparente et sérieuse sur la durée.` },
              { icon: '🤝', text: `Un partenaire **disponible émotionnellement**.` }
            ],
            mentalMap: (Array.isArray(p.mentalMap) && p.mentalMap.length > 0) ? p.mentalMap : [
              { id: 'valeurs', label: 'Valeurs & croyances', emoji: '💎', value: Math.min(95, Math.max(70, compatScore + 5)), color: '#10B981' },
              { id: 'projet', label: 'Projet de vie', emoji: '🌱', value: Math.min(95, Math.max(65, compatScore)), color: '#10B981' },
              { id: 'com', label: 'Communication dans le couple', emoji: '💬', value: 80, color: '#F59E0B' },
              { id: 'foyer', label: 'Finances & gestion du foyer', emoji: '💰', value: 74, color: '#F59E0B' },
              { id: 'sexe', label: 'Sexualité & intimité', emoji: '🔥', value: 65, color: '#EF4444' },
            ],
          };
        });
      } else {
        realProfiles = [];
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
      const response = await client.post('/matching/connect', { targetUserId: currentMatch.id });
      if (!response.data?.success) {
        closeOverlay();
        Alert.alert('Connexion impossible', response.data?.message || 'Ce profil n\'est plus disponible.');
        initScreen(true);
        return;
      }

      // HYPOTHÈSE TEMPORAIRE : le backend n'enregistre pas encore lui-même la
      // consommation du crédit lors de la connexion ; l'app débite le crédit
      // (POST /credit/spend) une fois la connexion effectivement enregistrée,
      // pour ne jamais facturer une connexion qui a échoué.
      const spend = await spendCredit(1, `Connexion avec ${currentMatch.firstName}`);
      if (!spend.ok && !spend.insufficient) {
        Alert.alert('Crédits', spend.reason || 'Le débit du crédit n\'a pas pu être enregistré.');
      }

      if (response.data.journey) {
        const matchRes = await client.get('/matching/my-matches');
        if (matchRes.data.length > 0) setActiveMatch(matchRes.data[0]);
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

    // Le crédit est débité avant l'acceptation : le backend rattache les
    // consommations récentes au parcours créé (règle de justice / remboursement
    // anti-ghosting).
    const spend = await spendCredit(1, `Acceptation du match avec ${likeName}`);
    if (!spend.ok) {
      setAcceptingProposal(null);
      setConnecting(false);
      if (spend.insufficient) {
        setOverlayMode('no_credit');
      } else {
        closeOverlay();
        Alert.alert('Crédits', spend.reason || 'Le débit du crédit a échoué.');
      }
      return;
    }

    try {
      const res = await client.post('/matching/accept', { proposalId });
      if (!res.data?.success) {
        closeOverlay();
        Alert.alert('Match', res.data?.message || 'Cette invitation n\'est plus valide.');
        await refreshCredits();
        initScreen(true);
        return;
      }
      const matchRes = await client.get('/matching/my-matches');
      if (matchRes.data.length > 0) setActiveMatch(matchRes.data[0]);
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

  const handleNext = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.timing(cardFade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setProfileIndex(i => {
        const total = profiles.length > 0 ? profiles.length : FALLBACK_PROFILES.length;
        return (i + 1) % total;
      });
    });
  };

  const handlePrev = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.timing(cardFade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setProfileIndex(i => {
        const total = profiles.length > 0 ? profiles.length : FALLBACK_PROFILES.length;
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
              <TouchableOpacity key={like.id} onPress={() => handleAcceptLike(like.id, like.name)} activeOpacity={0.85} style={styles.likeCard}>
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
                <Text style={styles.compatText}>{currentMatch.compatibility}% de compatibilité</Text>
              </LinearGradient>

              {/* Avatar central animée */}
              <View style={styles.avatarWrapper}>
                <AnonymousAvatar initial={(currentMatch?.firstName || "?").charAt(0)} />
              </View>

              {/* Footer de la grande carte : Nom + Slogan */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']}
                style={styles.cardFooter}
              >
                <Text style={styles.cardTitle}>{currentMatch.firstName}</Text>
                
                {/* Badges de localisation, âge, profession sous le nom */}
                <View style={styles.profileBadgesRow}>
                  {currentMatch.age && <Text style={styles.profileBadge}>{currentMatch.age} ans</Text>}
                  {currentMatch.location && <Text style={styles.profileBadge}>{currentMatch.location}</Text>}
                  {!!currentMatch.profession && <Text style={styles.profileBadge}>{currentMatch.profession}</Text>}
                  {!!currentMatch.distance && <Text style={styles.profileBadge}>{currentMatch.distance}</Text>}
                </View>

                <View style={styles.sloganBox}>
                  <Text style={styles.sloganQuote}>«</Text>
                  <Text style={styles.sloganText}>{currentMatch.slogan}</Text>
                  <Text style={styles.sloganQuote}>»</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.mainContent}>

              {/* 4. Analyse Boligo */}
              {currentMatch.aiAnalysis && (
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

              {/* 5. Affinités par module */}
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconCircle}><Text style={{fontSize:15}}>📊</Text></View>
                  <Text style={styles.sectionTitle}>AFFINITÉS PAR MODULE</Text>
                </View>
                <View style={styles.modulesCard}>
                  {currentMatch.mentalMap.map((p, i) => (
                    <PillarRow key={p.id} pillar={p} delay={i * 80} />
                  ))}
                </View>
              </View>

              {/* 6. Pourquoi vous pourriez fonctionner */}
              {currentMatch.positivePoints && (
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
              {currentMatch.warningPoint && (
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
                  {Object.entries(currentMatch.details).map(([key, val], i) => {
                    const labelMap: Record<string, string> = {
                      situation: 'Situation',
                      children: 'Enfants',
                      religion: 'Spiritualité',
                      education: 'Études',
                      lifestyle: 'Style de vie',
                    };
                    const emojiMap: Record<string, string> = {
                      situation: '💍',
                      children: '👶',
                      religion: '🙏',
                      education: '🎓',
                      lifestyle: '🏡',
                    };
                    return (
                      <View key={i} style={styles.detailBox}>
                        <View style={styles.detailBoxHeader}>
                          <Text style={{ fontSize: 13 }}>{emojiMap[key] || '✨'}</Text>
                          <Text style={styles.detailBoxLabel}>{(labelMap[key] || key).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.detailBoxVal}>{val}</Text>
                      </View>
                    );
                  })}
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
                  <Text style={styles.legendText}>Intérêt commun</Text>
                  <View style={[styles.legendDot, { backgroundColor: Colors.neutral.border }]} />
                  <Text style={styles.legendText}>Son intérêt</Text>
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
                  <Text style={styles.sectionTitle}>CE QU'IL/ELLE ATTEND VRAIMENT</Text>
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
                ) : (
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
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2, zIndex: 12,
    backgroundColor: '#10B981', borderRadius: 12, padding: 2,
    borderWidth: 2, borderColor: Colors.neutral.white,
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