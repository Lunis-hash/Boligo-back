import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
  Modal,
  ScrollView,
  Platform,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Path, Line, Text as SvgText, G, Ellipse, Polygon } from 'react-native-svg';
import { Colors, Typography } from '@/constants/theme';
import legal from '@/constants/legal.json';
import { Heart, X } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « 2026-10-02 » → « 2 octobre 2026 » (sans dépendre d'Intl, absent sur certains moteurs JS). */
function formatLegalVersion(version: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(version);
  if (!match) return version;
  const day = Number(match[3]);
  const month = FRENCH_MONTHS[Number(match[2]) - 1];
  if (!month) return version;
  return `${day === 1 ? '1er' : day} ${month} ${match[1]}`;
}

const LEGAL_VERSION_LABEL = formatLegalVersion(legal.version);

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── THÈMES DES 6 ÉCRANS ──────────────────────────────────────────
const SLIDES = [
  {
    id: '1',
    topRight: 'Passer',
    isStep: false,
    badgeText: 'Se découvrir autrement',
    badgeColor: '#C42E29',
    badgeBorder: 'rgba(232,64,58,0.35)',
    titleMain: 'Pas de photos.',
    titleItalic: 'Des questions pour vraiment se découvrir.',
    descLead: "L'IA vous connecte à ceux qui vous ressemblent.",
    descBody: " Ici, on ne juge pas un visage — on découvre une personne.",
    ctaText: 'Suivant →',
    ctaColors: ['#E8403A', '#E8834A'] as [string, string],
    themeColor: '#E8403A',
    blob1: '#E8403A',
    blob2: '#7C5CE8',
    haloColor: 'rgba(232,64,58,0.10)',
    haloBorder: 'rgba(232,64,58,0.16)',
    barColor: ['#E8403A', '#E8834A'] as [string, string],
    reassure: 'Inscription gratuite ● E-mail vérifié',
  },
  {
    id: '2',
    topRight: 'Étape 1',
    isStep: true,
    badgeText: 'Votre profil',
    badgeColor: '#5A3AB8',
    badgeBorder: 'rgba(124,92,232,0.35)',
    titleMain: 'Environ 70 questions.',
    titleItalic: "Puis l'IA fait le reste.",
    descLead: 'Onze modules pour construire votre profil de compatibilité — ',
    descLeadBold: 'vos réponses ne sont pas publiées',
    descBody: ". L'IA vous propose ensuite des profils ",
    descBodyBold: 'classés par compatibilité',
    descEnd: '. À vous de choisir.',
    ctaText: 'Suivant →',
    ctaColors: ['#7C5CE8', '#5A3AB8'] as [string, string],
    themeColor: '#7C5CE8',
    blob1: '#7C5CE8',
    blob2: '#E8403A',
    haloColor: 'rgba(124,92,232,0.10)',
    haloBorder: 'rgba(124,92,232,0.16)',
    barColor: ['#7C5CE8', '#5A3AB8'] as [string, string],
    reassure: 'Aucune photo affichée',
  },
  {
    id: '3',
    topRight: 'Étape 2 · Jours 1-3',
    isStep: true,
    badgeText: 'Parcours Harmonie',
    badgeColor: '#A87C1C',
    badgeBorder: 'rgba(200,154,46,0.4)',
    titleMain: '3 jours de questions.',
    titleItalic: "L'IA vous guide.",
    descLead: "L'IA vous pose la même question. Vous répondez chacun de votre côté, ",
    descLeadBold: "puis vous découvrez la réponse de l'autre.",
    descBody: " Aucune photo, aucun bavardage — que de l'essentiel.",
    ctaText: 'Suivant →',
    ctaColors: ['#D9AE3C', '#A87C1C'] as [string, string],
    themeColor: '#C89A2E',
    blob1: '#C89A2E',
    blob2: '#E8834A',
    haloColor: 'rgba(200,154,46,0.10)',
    haloBorder: 'rgba(200,154,46,0.18)',
    barColor: ['#D9AE3C', '#A87C1C'] as [string, string],
    reassure: 'Médiation IA bienveillante',
  },
  {
    id: '4',
    topRight: 'Étape 3 · Jours 4-6',
    isStep: true,
    badgeText: 'Échanges libres',
    badgeColor: '#0D7C74',
    badgeBorder: 'rgba(15,154,144,0.4)',
    titleMain: '3 jours à vous.',
    titleItalic: 'Sans questions imposées.',
    descLead: 'Le parcours Harmonie terminé, ',
    descLeadBold: 'la conversation vous appartient.',
    descBody: ' Trois jours pour parler de ce que vous voulez, à votre rythme.',
    ctaText: 'Suivant →',
    ctaColors: ['#17ADA2', '#0F8078'] as [string, string],
    themeColor: '#0F9A90',
    blob1: '#0F9A90',
    blob2: '#7C5CE8',
    haloColor: 'rgba(15,154,144,0.10)',
    haloBorder: 'rgba(15,154,144,0.16)',
    barColor: ['#17ADA2', '#0F8078'] as [string, string],
    reassure: 'Messagerie modérée ● Signalement intégré',
  },
  {
    id: '5',
    topRight: 'Passer',
    isStep: false,
    badgeText: 'Anti-ghosting',
    badgeColor: '#B3661A',
    badgeBorder: 'rgba(232,131,74,0.4)',
    titleMain: 'Le ghosting',
    titleItalic: 'a un prix, ici.',
    descLead: "Si l'autre cesse de répondre en cours de parcours, ",
    descLeadBold: 'il perd son crédit.',
    descBody: ' Le vôtre vous est ',
    descBodyBold: 'rendu automatiquement.',
    descEnd: " Vous ne payez jamais pour le silence de l'autre.",
    ctaText: 'Suivant →',
    ctaColors: ['#E8403A', '#E8834A'] as [string, string],
    themeColor: '#E8834A',
    blob1: '#E8403A',
    blob2: '#E8834A',
    haloColor: 'rgba(232,131,74,0.10)',
    haloBorder: 'rgba(232,131,74,0.16)',
    barColor: ['#E8403A', '#E8834A'] as [string, string],
    reassure: 'Crédit restitué automatiquement',
  },
  {
    id: '6',
    topRight: 'Étape 4 · Jour 7',
    isStep: true,
    badgeText: 'Rencontre réelle',
    badgeColor: '#158044',
    badgeBorder: 'rgba(30,158,90,0.4)',
    titleMain: '2 minutes en vidéo.',
    titleItalic: 'Puis vos contacts.',
    descLead: "L'appel se débloque : ",
    descLeadBold: '2 minutes pour mettre une voix et un visage sur la complicité.',
    descBody: " Ensuite, l'application vous propose d'échanger vos contacts — ",
    descBodyBold: 'si vous dites oui tous les deux.',
    ctaText: 'Créer mon compte gratuitement →',
    ctaColors: ['#25B368', '#158044'] as [string, string],
    themeColor: '#1E9E5A',
    blob1: '#1E9E5A',
    blob2: '#0F9A90',
    haloColor: 'rgba(30,158,90,0.10)',
    haloBorder: 'rgba(30,158,90,0.16)',
    barColor: ['#25B368', '#158044'] as [string, string],
    reassure: 'Sans engagement ● Données jamais revendues',
  },
];

export default function ValueSlidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  // Les CGU sont présentées ici pour information ; leur acceptation expresse
  // (case à cocher, version envoyée au serveur) se fait à la dernière étape de
  // l'inscription (profile-details), qu'aucun « Passer » ne permet d'éviter.
  const [showCguModal, setShowCguModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // L'index courant est dérivé de la position de défilement : onMomentumScrollEnd
  // n'existe pas sur le web et n'est pas déclenché par scrollToIndex sur toutes les
  // plateformes, ce qui bloquait le bouton « Suivant » sur le premier écran.
  const syncIndexFromOffset = (offsetX: number) => {
    const idx = Math.max(0, Math.min(SLIDES.length - 1, Math.round(offsetX / SCREEN_WIDTH)));
    if (idx !== currentIndexRef.current) {
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
    }
  };

  // ─── ANIMATIONS FLUIDES CONTINUES ─────────────────────────────────
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseNode = useRef(new Animated.Value(1)).current;
  const pulseGlow = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const clockTick = useRef(new Animated.Value(0)).current;
  const jitterAnim = useRef(new Animated.Value(0)).current;
  const cascade1 = useRef(new Animated.Value(0)).current;
  const cascade2 = useRef(new Animated.Value(0)).current;
  const cascade3 = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Respiration halo
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.05,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Rotation lente continue (spin-slow)
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Pulsation des nœuds orbitaux (node)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseNode, {
          toValue: 1.18,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseNode, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Lueur centrale (glow)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseGlow, {
          toValue: 1.14,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseGlow, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Flottaison particules
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -9,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 6. Aiguille chronomètre 2 min (tick)
    Animated.loop(
      Animated.timing(clockTick, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 7. Jitter micro-vibration
    Animated.loop(
      Animated.sequence([
        Animated.timing(jitterAnim, { toValue: 1.5, duration: 120, useNativeDriver: true }),
        Animated.timing(jitterAnim, { toValue: -1.5, duration: 120, useNativeDriver: true }),
        Animated.timing(jitterAnim, { toValue: 0.8, duration: 120, useNativeDriver: true }),
        Animated.timing(jitterAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    // 8. Cascade progressive des bulles
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(cascade1, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(180),
            Animated.timing(cascade2, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(360),
            Animated.timing(cascade3, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(2200),
        Animated.parallel([
          Animated.timing(cascade1, { toValue: 0.96, duration: 800, useNativeDriver: true }),
          Animated.timing(cascade2, { toValue: 0.96, duration: 800, useNativeDriver: true }),
          Animated.timing(cascade3, { toValue: 0.96, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // 9. Animation flèche de transfert anti-ghosting
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(arrowAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleNext = () => {
    const index = currentIndexRef.current;
    if (index < SLIDES.length - 1) {
      const nextIndex = index + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      // Sur le web, aucun événement de fin de défilement n'est garanti : on
      // synchronise l'index tout de suite pour que le bouton suive.
      syncIndexFromOffset(nextIndex * SCREEN_WIDTH);
    } else {
      router.replace('/onboarding/profile-details');
    }
  };

  const handleSkip = () => {
    router.replace('/onboarding/profile-details');
  };

  // Interpolations de rotation
  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const clockInterpolate = clockTick.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const arrowTranslateX = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  // ─── RENDU DES 6 ILLUSTRATIONS ANIMÉES ────────────────────────────
  const renderIllustration = (index: number) => {
    const slide = SLIDES[index];

    switch (index) {
      case 0:
        // Slide 1 : Pas de photo (jit), 3 questions (cascade), 2 avatars (pulse)
        return (
          <View style={styles.illusCenter}>
            <Animated.View
              style={[
                styles.iring,
                {
                  backgroundColor: slide.haloColor,
                  borderColor: slide.haloBorder,
                  transform: [{ scale: breatheAnim }],
                },
              ]}
            >
              {/* Particules flottantes */}
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(232,64,58,0.55)',
                    top: -12,
                    left: '18%',
                    width: 7,
                    height: 7,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(124,92,232,0.5)',
                    bottom: -10,
                    right: '18%',
                    width: 5,
                    height: 5,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />

              {/* Cercle en pointillés rotatif */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 146,
                  height: 146,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: spinInterpolate }],
                }}
              >
                <Svg width="146" height="146" viewBox="0 0 146 146">
                  <Circle
                    cx="73"
                    cy="73"
                    r="62"
                    stroke="rgba(232,64,58,0.22)"
                    strokeWidth="1.3"
                    strokeDasharray="5 5"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              {/* Contenu SVG */}
              <View style={{ width: 170, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                {/* Icône Appareil photo barré avec jitter */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 2,
                    alignSelf: 'center',
                    transform: [{ translateX: jitterAnim }],
                  }}
                >
                  <Svg width="34" height="26" viewBox="0 0 34 26">
                    <Rect
                      x="2"
                      y="1.5"
                      width="30"
                      height="23"
                      rx="5"
                      fill="rgba(20,16,14,0.04)"
                      stroke="rgba(20,16,14,0.22)"
                      strokeWidth="1.3"
                    />
                    <Circle
                      cx="17"
                      cy="13"
                      r="6.5"
                      stroke="rgba(20,16,14,0.22)"
                      strokeWidth="1.3"
                      fill="none"
                    />
                    <Line
                      x1="3"
                      y1="2.5"
                      x2="31"
                      y2="23.5"
                      stroke="#E8403A"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </Svg>
                </Animated.View>

                {/* 3 Bulles de questions animées en cascade */}
                <Animated.View
                  style={[
                    styles.cascadePill,
                    {
                      top: 36,
                      backgroundColor: 'rgba(232,64,58,0.09)',
                      borderColor: 'rgba(232,64,58,0.38)',
                      transform: [
                        { scale: cascade1.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                        { translateX: cascade1.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
                      ],
                      opacity: cascade1.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
                    },
                  ]}
                >
                  <Text style={styles.cascadeText}>« Qu'est-ce qui compte le plus ? »</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.cascadePill,
                    {
                      top: 64,
                      backgroundColor: 'rgba(124,92,232,0.09)',
                      borderColor: 'rgba(124,92,232,0.38)',
                      transform: [
                        { scale: cascade2.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                        { translateX: cascade2.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
                      ],
                      opacity: cascade2.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
                    },
                  ]}
                >
                  <Text style={styles.cascadeText}>« Où te vois-tu dans 5 ans ? »</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.cascadePill,
                    {
                      top: 92,
                      backgroundColor: 'rgba(232,131,74,0.09)',
                      borderColor: 'rgba(232,131,74,0.38)',
                      transform: [
                        { scale: cascade3.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                        { translateX: cascade3.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) },
                      ],
                      opacity: cascade3.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
                    },
                  ]}
                >
                  <Text style={styles.cascadeText}>« Ta plus belle décision ? »</Text>
                </Animated.View>

                {/* 2 Avatars connectés avec pulsation */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <Animated.View
                    style={[
                      styles.avatarBubble,
                      {
                        backgroundColor: 'rgba(124,92,232,0.3)',
                        borderColor: 'rgba(124,92,232,0.5)',
                        transform: [{ scale: pulseNode }],
                      },
                    ]}
                  />
                  <View style={styles.linkLine} />
                  <Animated.View
                    style={[
                      styles.avatarBubble,
                      {
                        backgroundColor: 'rgba(232,131,74,0.3)',
                        borderColor: 'rgba(232,131,74,0.5)',
                        transform: [{ scale: pulseNode }],
                      },
                    ]}
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        );

      case 1:
        // Slide 2 : Constellation de compatibilité avec rotation & pulsation
        return (
          <View style={styles.illusCenter}>
            <Animated.View
              style={[
                styles.iring,
                {
                  backgroundColor: slide.haloColor,
                  borderColor: slide.haloBorder,
                  transform: [{ scale: breatheAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(124,92,232,0.55)',
                    top: -12,
                    left: '20%',
                    width: 6,
                    height: 6,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />

              {/* Cercle en pointillés animé en rotation */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 144,
                  height: 144,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: spinInterpolate }],
                }}
              >
                <Svg width="144" height="144" viewBox="0 0 144 144">
                  <Circle
                    cx="72"
                    cy="72"
                    r="52"
                    stroke="rgba(124,92,232,0.28)"
                    strokeWidth="1.4"
                    strokeDasharray="5 4"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              <Svg width="180" height="170" viewBox="0 0 144 134">
                {/* Lignes de connexion */}
                <Line x1="52" y1="55" x2="35" y2="42" stroke="rgba(124,92,232,0.5)" strokeWidth="1.3" />
                <Line x1="92" y1="55" x2="109" y2="42" stroke="rgba(124,92,232,0.5)" strokeWidth="1.3" />
                <Line x1="52" y1="79" x2="29" y2="86" stroke="rgba(232,64,58,0.5)" strokeWidth="1.3" />
                <Line x1="92" y1="79" x2="115" y2="86" stroke="rgba(232,64,58,0.5)" strokeWidth="1.3" />
                <Line x1="72" y1="42" x2="72" y2="18" stroke="rgba(232,131,74,0.5)" strokeWidth="1.3" />
                <Line x1="72" y1="92" x2="72" y2="116" stroke="rgba(232,131,74,0.5)" strokeWidth="1.3" />

                {/* 6 Nœuds orbitaux */}
                <Circle cx="28" cy="34" r="9" fill="rgba(124,92,232,0.28)" stroke="rgba(124,92,232,0.55)" strokeWidth="1.5" />
                <Circle cx="116" cy="34" r="9" fill="rgba(124,92,232,0.28)" stroke="rgba(124,92,232,0.55)" strokeWidth="1.5" />
                <Circle cx="20" cy="92" r="9" fill="rgba(232,64,58,0.28)" stroke="rgba(232,64,58,0.55)" strokeWidth="1.5" />
                <Circle cx="124" cy="92" r="9" fill="rgba(232,64,58,0.28)" stroke="rgba(232,64,58,0.55)" strokeWidth="1.5" />
                <Circle cx="72" cy="10" r="8" fill="rgba(232,131,74,0.3)" stroke="rgba(232,131,74,0.6)" strokeWidth="1.5" />
                <Circle cx="72" cy="124" r="8" fill="rgba(232,131,74,0.3)" stroke="rgba(232,131,74,0.6)" strokeWidth="1.5" />
              </Svg>

              {/* Cœur central (score de compatibilité) avec pulsation */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: 'rgba(124,92,232,0.18)',
                  borderWidth: 2,
                  borderColor: 'rgba(124,92,232,0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pulseGlow }],
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(124,92,232,0.75)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Heart size={15} color="#FFF" fill="#FFF" strokeWidth={2} />
                </View>
              </Animated.View>
            </Animated.View>
          </View>
        );

      case 2:
        // Slide 3 : Questions guidées IA — Nœuds ? et IA palpitant
        return (
          <View style={styles.illusCenter}>
            <Animated.View
              style={[
                styles.iring,
                {
                  backgroundColor: slide.haloColor,
                  borderColor: slide.haloBorder,
                  transform: [{ scale: breatheAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(200,154,46,0.55)',
                    top: -12,
                    left: '22%',
                    width: 6,
                    height: 6,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />

              {/* Centre IA avec halo tournant */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 24,
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: spinInterpolate }],
                }}
              >
                <Svg width="48" height="48" viewBox="0 0 48 48">
                  <Circle
                    cx="24"
                    cy="24"
                    r="22"
                    stroke="rgba(200,154,46,0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              <Svg width="180" height="170" viewBox="0 0 152 138">
                {/* Nœuds ? */}
                <Circle cx="22" cy="38" r="16" fill="rgba(200,154,46,0.16)" stroke="rgba(200,154,46,0.45)" strokeWidth="1.6" />
                <SvgText x="18" y="44" fill="rgba(168,124,28,0.9)" fontSize="14" fontWeight="700">?</SvgText>

                <Circle cx="130" cy="38" r="16" fill="rgba(232,131,74,0.16)" stroke="rgba(232,131,74,0.45)" strokeWidth="1.6" />
                <SvgText x="126" y="44" fill="rgba(200,120,40,0.9)" fontSize="14" fontWeight="700">?</SvgText>

                {/* Lignes de flux */}
                <Line x1="53" y1="38" x2="38" y2="38" stroke="rgba(200,154,46,0.6)" strokeWidth="1.4" />
                <Line x1="99" y1="38" x2="114" y2="38" stroke="rgba(232,131,74,0.6)" strokeWidth="1.4" />

                {/* Question posée */}
                <Rect x="10" y="68" width="132" height="19" rx="9.5" fill="rgba(200,154,46,0.12)" stroke="rgba(200,154,46,0.45)" strokeWidth="1.2" />
                <SvgText x="16" y="81" fill="rgba(20,16,14,0.75)" fontSize="7.4" fontWeight="600">IA · « Qu'est-ce qui te fait rester ? »</SvgText>

                {/* Réponses */}
                <Rect x="10" y="92" width="63" height="18" rx="9" fill="rgba(200,154,46,0.09)" stroke="rgba(200,154,46,0.35)" strokeWidth="1.1" />
                <SvgText x="18" y="104" fill="rgba(20,16,14,0.65)" fontSize="7.5" fontWeight="500">Sa réponse</SvgText>

                <Rect x="79" y="92" width="63" height="18" rx="9" fill="rgba(232,131,74,0.09)" stroke="rgba(232,131,74,0.35)" strokeWidth="1.1" />
                <SvgText x="87" y="104" fill="rgba(20,16,14,0.65)" fontSize="7.5" fontWeight="500">Ta réponse</SvgText>

                {/* Badge 3 jours */}
                <Rect x="34" y="116" width="84" height="18" rx="9" fill="rgba(200,154,46,0.16)" stroke="rgba(200,154,46,0.45)" strokeWidth="1.2" />
                <SvgText x="38" y="129" fill="#A87C1C" fontSize="8.5" fontWeight="700">3 jours · sans photo</SvgText>
              </Svg>

              {/* Centre IA avec pulsation */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 35,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: 'rgba(200,154,46,0.75)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pulseGlow }],
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>IA</Text>
              </Animated.View>
            </Animated.View>
          </View>
        );

      case 3:
        // Slide 4 : Échanges libres — Bulles interactives
        return (
          <View style={styles.illusCenter}>
            <Animated.View
              style={[
                styles.iring,
                {
                  backgroundColor: slide.haloColor,
                  borderColor: slide.haloBorder,
                  transform: [{ scale: breatheAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(15,154,144,0.55)',
                    top: -12,
                    right: '18%',
                    width: 6,
                    height: 6,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />

              <View style={{ width: 170, height: 160, justifyContent: 'center' }}>
                <Animated.View
                  style={[
                    styles.chatBubble,
                    {
                      alignSelf: 'flex-start',
                      backgroundColor: 'rgba(15,154,144,0.12)',
                      borderColor: 'rgba(15,154,144,0.45)',
                      transform: [{ scale: cascade1.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
                    },
                  ]}
                >
                  <Text style={styles.chatBubbleText}>Tu lis quoi en ce moment ?</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.chatBubble,
                    {
                      alignSelf: 'flex-end',
                      marginTop: 8,
                      backgroundColor: 'rgba(124,92,232,0.11)',
                      borderColor: 'rgba(124,92,232,0.42)',
                      transform: [{ scale: cascade2.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
                    },
                  ]}
                >
                  <Text style={styles.chatBubbleText}>Dostoïevski 📚 et toi ?</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.chatBubble,
                    {
                      alignSelf: 'flex-start',
                      marginTop: 8,
                      backgroundColor: 'rgba(15,154,144,0.12)',
                      borderColor: 'rgba(15,154,144,0.45)',
                      transform: [{ scale: cascade3.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
                    },
                  ]}
                >
                  <Text style={styles.chatBubbleText}>Pareil ! On se ressemble 😊</Text>
                </Animated.View>

                <View
                  style={{
                    alignSelf: 'center',
                    marginTop: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                    backgroundColor: 'rgba(15,154,144,0.15)',
                    borderWidth: 1.2,
                    borderColor: 'rgba(15,154,144,0.45)',
                  }}
                >
                  <Text style={{ color: '#0D7C74', fontSize: 9, fontWeight: '700' }}>3 jours · en liberté</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        );

      case 4:
        // Slide 5 : Anti-ghosting — Flèche de transfert animée
        return (
          <View style={styles.illusCenter}>
            <Animated.View
              style={[
                styles.iring,
                {
                  backgroundColor: slide.haloColor,
                  borderColor: slide.haloBorder,
                  transform: [{ scale: breatheAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(232,131,74,0.55)',
                    top: -12,
                    right: '20%',
                    width: 7,
                    height: 7,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />

              {/* Cercle en pointillés tournant */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 150,
                  height: 150,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: spinInterpolate }],
                }}
              >
                <Svg width="150" height="150" viewBox="0 0 150 150">
                  <Circle
                    cx="75"
                    cy="75"
                    r="62"
                    stroke="rgba(232,131,74,0.2)"
                    strokeWidth="1.3"
                    strokeDasharray="5 5"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              <Svg width="180" height="170" viewBox="0 0 150 136">
                {/* Avatar Ghoster */}
                <Circle cx="30" cy="46" r="19" fill="rgba(20,16,14,0.04)" stroke="rgba(20,16,14,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
                <Circle cx="30" cy="40" r="8" fill="rgba(20,16,14,0.12)" />
                <Ellipse cx="30" cy="57" rx="12" ry="6" fill="rgba(20,16,14,0.08)" />

                {/* Badge -1© */}
                <Rect x="8" y="72" width="46" height="20" rx="10" fill="rgba(232,64,58,0.10)" stroke="rgba(232,64,58,0.45)" strokeWidth="1.3" />
                <SvgText x="15" y="85" fill="#E8403A" fontSize="10" fontWeight="700">− 1 ©</SvgText>

                {/* Avatar Protégé */}
                <Circle cx="120" cy="46" r="19" fill="rgba(30,158,90,0.14)" stroke="rgba(30,158,90,0.5)" strokeWidth="1.6" />
                <Circle cx="120" cy="40" r="8" fill="rgba(30,158,90,0.4)" />
                <Ellipse cx="120" cy="57" rx="12" ry="6" fill="rgba(30,158,90,0.25)" />

                {/* Badge +1© */}
                <Rect x="96" y="72" width="48" height="20" rx="10" fill="rgba(30,158,90,0.12)" stroke="rgba(30,158,90,0.5)" strokeWidth="1.3" />
                <SvgText x="103" y="85" fill="#158044" fontSize="10" fontWeight="700">+ 1 ©</SvgText>

                {/* Badge Automatique */}
                <Rect x="34" y="110" width="82" height="18" rx="9" fill="rgba(232,131,74,0.13)" stroke="rgba(232,131,74,0.42)" strokeWidth="1.2" />
                <SvgText x="38" y="123" fill="#B3661A" fontSize="8.5" fontWeight="700">✓ Automatique</SvgText>
              </Svg>

              {/* Flèche animée de transfert de crédit */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 50,
                  transform: [{ translateX: arrowTranslateX }],
                }}
              >
                <Svg width="40" height="20" viewBox="0 0 40 20">
                  <Line x1="4" y1="10" x2="30" y2="10" stroke="rgba(232,131,74,0.85)" strokeWidth="2.2" strokeLinecap="round" />
                  <Polygon points="34,10 26,5 26,15" fill="rgba(232,131,74,0.9)" />
                </Svg>
              </Animated.View>
            </Animated.View>
          </View>
        );

      case 5:
        // Slide 6 : Vidéo 2 min avec aiguille d'horloge tournante
        return (
          <View style={styles.illusCenter}>
            <Animated.View
              style={[
                styles.iring,
                {
                  backgroundColor: slide.haloColor,
                  borderColor: slide.haloBorder,
                  transform: [{ scale: breatheAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.floatDot,
                  {
                    backgroundColor: 'rgba(30,158,90,0.55)',
                    top: -12,
                    left: '24%',
                    width: 7,
                    height: 7,
                    transform: [{ translateY: floatAnim }],
                  },
                ]}
              />

              <Svg width="180" height="170" viewBox="0 0 148 138">
                {/* Cadre vidéo global */}
                <Rect x="17" y="4" width="114" height="62" rx="14" fill="rgba(30,158,90,0.06)" stroke="rgba(30,158,90,0.5)" strokeWidth="2" strokeDasharray="7 4" />

                {/* Vidéo Utilisateur 1 */}
                <Rect x="24" y="10" width="48" height="50" rx="10" fill="rgba(124,92,232,0.12)" stroke="rgba(124,92,232,0.3)" strokeWidth="1.2" />
                <Circle cx="48" cy="27" r="10" fill="rgba(124,92,232,0.35)" stroke="rgba(124,92,232,0.45)" strokeWidth="1" />
                <Ellipse cx="48" cy="45" rx="14" ry="8" fill="rgba(124,92,232,0.18)" />

                {/* Vidéo Utilisateur 2 */}
                <Rect x="76" y="10" width="48" height="50" rx="10" fill="rgba(232,131,74,0.12)" stroke="rgba(232,131,74,0.3)" strokeWidth="1.2" />
                <Circle cx="100" cy="27" r="10" fill="rgba(232,131,74,0.35)" stroke="rgba(232,131,74,0.45)" strokeWidth="1" />
                <Ellipse cx="100" cy="45" rx="14" ry="8" fill="rgba(232,131,74,0.18)" />

                {/* Chronomètre 2 min */}
                <Circle cx="74" cy="80" r="14" fill="rgba(30,158,90,0.10)" stroke="rgba(30,158,90,0.45)" strokeWidth="1.5" />
                <SvgText x="64" y="104" fill="#158044" fontSize="9" fontWeight="700">2 min</SvgText>

                {/* Double consentement ✓ Oui */}
                <Rect x="14" y="114" width="52" height="19" rx="9.5" fill="rgba(30,158,90,0.14)" stroke="rgba(30,158,90,0.5)" strokeWidth="1.2" />
                <SvgText x="24" y="127" fill="#158044" fontSize="8.5" fontWeight="700">✓ Oui</SvgText>

                <Rect x="82" y="114" width="52" height="19" rx="9.5" fill="rgba(15,154,144,0.14)" stroke="rgba(15,154,144,0.5)" strokeWidth="1.2" />
                <SvgText x="92" y="127" fill="#0D7C74" fontSize="8.5" fontWeight="700">✓ Oui</SvgText>

                <Line x1="66" y1="123" x2="82" y2="123" stroke="rgba(30,158,90,0.6)" strokeWidth="1.5" strokeLinecap="round" />
              </Svg>

              {/* Aiguille rotative du chronomètre 2 min */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 86,
                  alignSelf: 'center',
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: clockInterpolate }],
                }}
              >
                <View
                  style={{
                    width: 1.8,
                    height: 8,
                    backgroundColor: 'rgba(30,158,90,0.9)',
                    borderRadius: 1,
                    marginBottom: 8,
                  }}
                />
              </Animated.View>
            </Animated.View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderSlideItem = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    return (
      <View style={[styles.slidePage, { width: SCREEN_WIDTH }]}>
        {/* Zone Illustration */}
        <View style={styles.illusContainer}>
          {renderIllustration(index)}
        </View>

        {/* Zone Contenu Bas */}
        <View style={styles.bottomSection}>
          {/* Barres de progression 6 étapes */}
          <View style={styles.progRow}>
            {SLIDES.map((s, idx) => {
              const isPassed = idx < index;
              const isCurrent = idx === index;

              return (
                <View key={s.id} style={styles.progSegment}>
                  {isPassed || isCurrent ? (
                    <LinearGradient
                      colors={s.barColor}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progFill}
                    />
                  ) : (
                    <View style={styles.progEmpty} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Badge catégorie */}
          <View style={[styles.badge, { borderColor: item.badgeBorder }]}>
            <Text style={[styles.badgeText, { color: item.badgeColor }]}>
              {item.badgeText.toUpperCase()}
            </Text>
          </View>

          {/* Titre & sous-titre stylisés */}
          <Text style={styles.titleText}>
            {item.titleMain}{'\n'}
            <Text style={styles.italicText}>{item.titleItalic}</Text>
          </Text>

          {/* Description avec gras */}
          <Text style={styles.descText}>
            <Text style={styles.descBold}>{item.descLead}</Text>
            {item.descLeadBold && <Text style={styles.descBold}>{item.descLeadBold}</Text>}
            {item.descBody}
            {item.descBodyBold && <Text style={styles.descBold}>{item.descBodyBold}</Text>}
            {item.descEnd || ''}
          </Text>

          {/* Information CGU sur le dernier écran : l'acceptation expresse a lieu à la
              dernière étape de l'inscription, où elle est enregistrée par le serveur. */}
          {index === 5 && (
            <View style={styles.cguBox} testID="slides-cgu-notice">
              <Text style={styles.cguText}>
                Service réservé aux personnes majeures. Vous pourrez lire et accepter les{' '}
                <Text
                  style={styles.cguLink}
                  onPress={() => setShowCguModal(true)}
                  accessibilityRole="link"
                >
                  Conditions Générales d'Utilisation et de Vente
                </Text>{' '}
                à la dernière étape de l'inscription.
              </Text>
            </View>
          )}

          {/* Bouton CTA */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.88}
            style={styles.ctaWrapper}
          >
            <LinearGradient
              colors={item.ctaColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>{item.ctaText}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Réassurance */}
          <Text style={styles.reassureText}>{item.reassure}</Text>
        </View>
      </View>
    );
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Blobs décoratifs en arrière-plan */}
      <View style={styles.meshBg} pointerEvents="none">
        <View
          style={[
            styles.blobTop,
            { backgroundColor: currentSlide.blob1 + '15' },
          ]}
        />
        <View
          style={[
            styles.blobBottom,
            { backgroundColor: currentSlide.blob2 + '15' },
          ]}
        />
      </View>

      {/* Header fixe adapté à tous les écrans */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top + 8, 44),
          },
        ]}
      >
        <Text style={styles.logoText}>BOLIGO</Text>

        {currentSlide.isStep ? (
          <View style={styles.stepTag}>
            <Text style={styles.stepTagText}>{currentSlide.topRight}</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>{currentSlide.topRight}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Carrousel plein écran */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlideItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        onScroll={(e) => syncIndexFromOffset(e.nativeEvent.contentOffset.x)}
        onMomentumScrollEnd={(e) => syncIndexFromOffset(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      />

      {/* ══ MODALE CGU — texte issu de constants/legal.json (source unique) ══ */}
      <Modal
        visible={showCguModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCguModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom + 16, 24) },
            ]}
            testID="cgu-sheet"
          >
            {/* Header Modale */}
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle} numberOfLines={2}>
                {legal.cgu.title}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCguModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <X size={22} color="#918780" />
              </TouchableOpacity>
            </View>

            {/* Corps scrollable */}
            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetVersion} testID="cgu-sheet-version">
                {legal.company.brand} — version du {LEGAL_VERSION_LABEL}
              </Text>

              <Text style={styles.sheetP}>{legal.cgu.intro}</Text>

              {legal.cgu.sections.map((section) => (
                <View key={section.id}>
                  <Text style={styles.sheetArticleTitle}>
                    {section.title.toUpperCase()}
                  </Text>
                  {section.paragraphs.map((paragraph, i) => (
                    <Text key={i} style={styles.sheetP}>
                      {paragraph}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.sheetLinks}>
              <TouchableOpacity
                onPress={() => { setShowCguModal(false); router.push('/legal/cgu' as any); }}
                testID="cgu-full-link"
              >
                <Text style={styles.sheetLink}>Ouvrir en plein écran</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCguModal(false); router.push('/legal/confidentialite' as any); }}>
                <Text style={styles.sheetLink}>Politique de confidentialité</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Modale */}
            <TouchableOpacity
              style={styles.sheetCta}
              onPress={() => setShowCguModal(false)}
            >
              <Text style={styles.sheetCtaText}>J'ai compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES IDENTIQUES AU DESIGN OFFICIEL ─────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  meshBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    right: -40,
  },
  blobBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -40,
    left: -40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingBottom: 10,
    zIndex: 20,
  },
  logoText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    fontWeight: '800',
    color: '#E8403A',
    letterSpacing: 2.6,
  },
  skipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13.5,
    color: '#918780',
    fontWeight: '600',
  },
  stepTag: {
    backgroundColor: 'rgba(20,16,14,0.05)',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 10,
  },
  stepTagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10.5,
    color: '#5C534C',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  slidePage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  illusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT * 0.30,
    maxHeight: SCREEN_HEIGHT * 0.42,
  },
  illusCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iring: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatDot: {
    position: 'absolute',
    borderRadius: 10,
  },
  cascadePill: {
    position: 'absolute',
    width: 136,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cascadeText: {
    fontSize: 7.6,
    fontWeight: '600',
    color: 'rgba(20,16,14,0.78)',
  },
  avatarBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.4,
  },
  linkLine: {
    width: 22,
    height: 1.8,
    backgroundColor: 'rgba(232,64,58,0.7)',
    borderRadius: 1,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 13,
    borderWidth: 1.3,
  },
  chatBubbleText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: 'rgba(20,16,14,0.75)',
  },
  bottomSection: {
    paddingHorizontal: 26,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    backgroundColor: '#FFFFFF',
  },
  progRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  progSegment: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(20,16,14,0.09)',
    overflow: 'hidden',
  },
  progFill: {
    flex: 1,
    borderRadius: 2,
  },
  progEmpty: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 4.5,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  titleText: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 29,
    fontWeight: '800',
    color: '#14100E',
    lineHeight: 33,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  italicText: {
    fontStyle: 'italic',
    fontWeight: '400',
    color: '#5C534C',
  },
  descText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: '#5C534C',
    lineHeight: 21,
    marginBottom: 20,
  },
  descBold: {
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
    color: '#14100E',
  },
  cguBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(20,16,14,0.10)',
    borderRadius: 13,
    backgroundColor: 'rgba(20,16,14,0.015)',
    marginBottom: 16,
    gap: 10,
  },
  cguText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#5C534C',
  },
  cguLink: {
    color: '#E8403A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  ctaWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#E8403A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaButton: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  reassureText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11.5,
    color: '#918780',
    textAlign: 'center',
    marginTop: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,16,14,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20,16,14,0.10)',
  },
  sheetTitle: {
    flex: 1,
    marginRight: 12,
    fontFamily: Typography.fontFamily.serif,
    fontSize: 17,
    fontWeight: '800',
    color: '#14100E',
  },
  sheetBody: {
    paddingVertical: 16,
  },
  sheetVersion: {
    fontSize: 11,
    color: '#918780',
    marginBottom: 14,
  },
  sheetArticleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8403A',
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  sheetP: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#5C534C',
    marginBottom: 10,
  },
  sheetLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  sheetLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8403A',
    textDecorationLine: 'underline',
  },
  sheetCta: {
    backgroundColor: '#E8403A',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  sheetCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
