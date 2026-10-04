import { ReactNode, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Brand } from '@/constants/brand';
import { useBrandFonts } from '@/services/brandFonts';
import { landingFonts, LandingFonts } from './fonts';
import { Showcase } from './Showcase';

type SectionKey = 'parcours' | 'pacte' | 'tarif' | 'questions';

const NAV: { key: SectionKey; label: string }[] = [
  { key: 'parcours', label: 'Le parcours' },
  { key: 'pacte', label: 'Anti-ghosting' },
  { key: 'tarif', label: 'Tarif' },
  { key: 'questions', label: 'Questions' },
];

const PEOPLE = [
  {
    initial: 'I',
    name: 'Inès, 23 ans',
    role: 'Étudiante · Lille',
    quote: 'Je veux du sérieux, pas un jeu.',
    text: 'Quitter les applis où l’on swipe sans fin, et rencontrer quelqu’un qui partage ses ambitions.',
    tint: Brand.rose,
    color: Brand.framboise,
  },
  {
    initial: 'Y',
    name: 'Yanis, 38 ans',
    role: 'Infirmier · Nantes',
    quote: 'Je veux fonder une famille.',
    text: 'Enfants, lieu de vie, foi : savoir tout de suite si les projets vont dans le même sens.',
    tint: Brand.lilas,
    color: Brand.lavande,
  },
  {
    initial: 'N',
    name: 'Nadia, 58 ans',
    role: 'Comptable · Bordeaux',
    quote: 'J’ai le droit de recommencer.',
    text: 'Après une séparation, prendre son temps, sans exposer ses photos, à son rythme.',
    tint: Brand.ciel,
    color: Brand.nuit,
  },
];

const STEPS = [
  { title: 'Le Grand Entretien', text: 'Environ 70 questions en 11 modules sur vos valeurs et votre quotidien.' },
  { title: 'La Découverte', text: 'Des profils classés par compatibilité, avec une fiche claire.' },
  { title: 'Le Sondeur', text: '3 jours, 7 questions par jour, réponses révélées à deux.' },
  { title: 'Le chat libre', text: '3 jours d’échanges dans une messagerie modérée.' },
  { title: '7 minutes de vidéo', text: 'Puis vos coordonnées, seulement si vous le voulez tous les deux.' },
];
const STEP_TINTS = [
  [Brand.rose, Brand.framboise],
  [Brand.lilas, Brand.lavande],
  [Brand.ciel, Brand.nuit],
  [Brand.rose, Brand.framboise],
];

const PACT = [
  {
    title: 'Je m’engage',
    text: 'Avant chaque parcours, chacun accepte le pacte : aller au bout, ou partir poliment.',
  },
  {
    title: 'Je peux partir poliment',
    text: 'À tout moment, vous mettez fin au parcours avec un message de courtoisie. L’autre est prévenu, jamais laissé dans le vide.',
  },
  {
    title: 'Un compte à rebours visible',
    text: 'Quand l’un attend une réponse, l’échéance s’affiche dans l’application : en général 48 h pour répondre.',
  },
  {
    title: 'Votre crédit rendu',
    text: 'Sans réponse à l’échéance, le parcours se termine et la personne qui attendait récupère son crédit.',
  },
];

const FAQ = [
  {
    q: 'Pourquoi n’y a-t-il pas de photos ?',
    a: 'Parce que l’attirance durable naît des valeurs partagées et de la conversation. Les visages se découvrent lors des 7 minutes de vidéo.',
  },
  {
    q: 'BOLIGO, c’est pour quel âge ?',
    a: 'Pour tous les adultes, dès 18 ans et sans limite d’âge. Le Grand Entretien adapte certaines questions à votre âge, et chacun avance à son rythme.',
  },
  {
    q: 'Et si l’autre ne répond plus ?',
    a: 'Chacun s’engage à suivre le parcours ou à y mettre fin poliment. Si l’autre ne répond plus, un compte à rebours s’affiche ; sans réponse à l’échéance, le parcours se termine et votre crédit vous est rendu.',
  },
  {
    q: 'Puis-je arrêter un parcours ?',
    a: 'Oui, à tout moment, depuis la messagerie. Vous choisissez un message de courtoisie ; l’autre est prévenu et récupère son crédit.',
  },
  {
    q: 'Mes coordonnées sont-elles protégées ?',
    a: 'Oui. Votre téléphone ou votre e-mail n’est révélé qu’à la fin du parcours, et seulement si vous l’acceptez tous les deux.',
  },
];

/** Page d'accueil publique (visiteur non connecté), ordinateur et téléphone. */
export function LandingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready } = useBrandFonts();
  const ff = useMemo(() => landingFonts(ready), [ready]);
  const wide = width >= 1024;
  const tablet = width >= 720;
  const padX = wide ? 32 : 20;

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});
  const mark = (key: SectionKey) => (e: { nativeEvent: { layout: { y: number } } }) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };
  const scrollTo = (key: SectionKey) => {
    const y = sectionY.current[key];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };
  const start = () => router.push('/onboarding/value-slides');
  const login = () => router.push('/(auth)/login');

  const container: ViewStyle = { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: padX };
  const h2: StyleProp<TextStyle> = [
    styles.h2,
    ff.title,
    { fontSize: wide ? 50 : 31, lineHeight: wide ? 56 : 36 },
  ];
  const sectionGap = wide ? 104 : 56;

  return (
    <View style={styles.page}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête et accroche */}
        <View style={styles.heroWrap}>
          <Blob color={Brand.rose} size={wide ? 860 : 520} style={{ top: wide ? -260 : -160, right: wide ? -220 : -200 }} />
          <Blob color={Brand.lilas} size={wide ? 560 : 400} style={{ top: wide ? 160 : 360, right: wide ? 260 : undefined, left: wide ? undefined : -240 }} />
          {wide && <Blob color={Brand.ciel} size={520} style={{ bottom: 90, left: -260 }} />}

          <View style={[container, styles.header]}>
            <Logo ff={ff} size={wide ? 28 : 24} />
            {wide ? (
              <View style={styles.nav}>
                {NAV.map((item) => (
                  <Pressable key={item.key} onPress={() => scrollTo(item.key)} accessibilityRole="link">
                    <Text style={[styles.navLink, ff.semi]}>{item.label}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={login} accessibilityRole="link">
                  <Text style={[styles.navLink, ff.semi, { color: Brand.framboise }]}>Se connecter</Text>
                </Pressable>
                <PrimaryButton label="Commencer gratuitement" onPress={start} ff={ff} small />
              </View>
            ) : (
              <Pressable onPress={login} accessibilityRole="link" style={styles.loginPill} hitSlop={8}>
                <Text style={[styles.loginPillText, ff.bold]}>Connexion</Text>
              </Pressable>
            )}
          </View>

          <View
            style={[
              container,
              {
                flexDirection: wide ? 'row' : 'column',
                alignItems: wide ? 'center' : 'stretch',
                gap: wide ? 56 : 32,
                paddingTop: wide ? 24 : 8,
                paddingBottom: wide ? 96 : 48,
              },
            ]}
          >
            <View style={{ flex: wide ? 1.1 : undefined, gap: wide ? 26 : 18 }}>
              <View style={styles.pill}>
                <LinearGradient colors={[Brand.framboise, Brand.lavande]} style={styles.pillDot} />
                <Text style={[styles.pillText, ff.bold]}>
                  {tablet ? 'Rencontres sérieuses · sans photos' : 'Sérieux · sans photos · dès 18 ans'}
                </Text>
              </View>
              <Text
                accessibilityRole="header"
                style={[
                  styles.h1,
                  ff.title,
                  { fontSize: wide ? 72 : tablet ? 56 : 42, lineHeight: wide ? 76 : tablet ? 60 : 46 },
                ]}
              >
                Rencontrez la personne qui partage <Text style={[ff.titleItalic, { color: Brand.framboise }]}>vos valeurs.</Text>
              </Text>
              <Text style={[styles.lead, ff.text, { fontSize: wide ? 20 : 17, lineHeight: wide ? 32 : 26 }]}>
                Pas de photos, pas de swipe. BOLIGO vous présente des personnes compatibles avec votre projet de vie :
                vous échangez d’abord par les mots, puis 7 minutes en vidéo.
              </Text>
              <View style={{ flexDirection: tablet ? 'row' : 'column', gap: 12, alignItems: tablet ? 'center' : 'stretch' }}>
                <PrimaryButton label="Trouver mon BOLIGO" onPress={start} ff={ff} arrow testID="landing-start" />
                <SecondaryButton label="Voir le parcours" onPress={() => scrollTo('parcours')} ff={ff} />
              </View>
              <View style={[styles.trustRow, !tablet && { justifyContent: 'center' }]}>
                {['Inscription gratuite', 'Dès 18 ans', 'Anti-ghosting'].map((label) => (
                  <View key={label} style={styles.trustItem}>
                    <CheckBadge />
                    <Text style={[styles.trustText, ff.semi]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flex: wide ? 1 : undefined }}>
              <Showcase wide={wide} ff={ff} />
            </View>
          </View>
        </View>

        {/* Pour qui : tous les âges */}
        <View style={[container, { paddingBottom: sectionGap, gap: wide ? 40 : 18 }]}>
          <View style={{ flexDirection: wide ? 'row' : 'column', justifyContent: 'space-between', alignItems: wide ? 'flex-end' : 'flex-start', gap: 16 }}>
            <Text style={[h2, { maxWidth: 720 }]}>
              À chaque âge, <Text style={[ff.titleItalic, { color: Brand.lavande }]}>l’envie d’une vraie rencontre.</Text>
            </Text>
            <Text style={[styles.body, ff.text, { maxWidth: 400 }]}>
              Que vous débutiez dans la vie à deux ou que vous recommenciez, vous rencontrez des personnes qui cherchent la même chose que vous.
            </Text>
          </View>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 14 }}>
            {PEOPLE.map((p) => (
              <View key={p.name} style={[styles.personCard, { backgroundColor: p.tint, flex: wide ? 1 : undefined, padding: wide ? 30 : 20 }]}>
                <View style={styles.personHead}>
                  <View style={[styles.personAvatar, { backgroundColor: p.color }]}>
                    <Text style={[styles.personInitial, ff.title]}>{p.initial}</Text>
                  </View>
                  <View>
                    <Text style={[styles.personName, ff.bold]}>{p.name}</Text>
                    <Text style={[styles.small, ff.text]}>{p.role}</Text>
                  </View>
                </View>
                <Text style={[styles.personQuote, ff.titleItalic, { fontSize: wide ? 26 : 22, lineHeight: wide ? 33 : 28 }]}>
                  «&nbsp;{p.quote}&nbsp;»
                </Text>
                {tablet && <Text style={[styles.body, ff.text]}>{p.text}</Text>}
              </View>
            ))}
          </View>
          <Text style={[styles.note, ff.text]}>Exemples fictifs, à titre d’illustration.</Text>
        </View>

        {/* Le Parcours Harmonie */}
        <View onLayout={mark('parcours')} style={[container, { paddingBottom: sectionGap, paddingHorizontal: wide ? padX : 12 }]}>
          <LinearGradient
            colors={[Brand.lilas, Brand.rose]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.journeyBox, { padding: wide ? 56 : 18, paddingVertical: wide ? 64 : 34, borderRadius: wide ? 40 : 30 }]}
          >
            <View style={{ gap: 12, maxWidth: 720, paddingHorizontal: wide ? 0 : 4 }}>
              <Text style={[styles.overline, ff.bold, { color: Brand.lavande }]}>LE PARCOURS HARMONIE</Text>
              <Text style={h2}>
                Une semaine pour se découvrir, <Text style={[ff.titleItalic, { color: Brand.framboise }]}>étape par étape.</Text>
              </Text>
            </View>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 16 : 10, marginTop: wide ? 40 : 18 }}>
              {STEPS.map((step, i) => {
                const last = i === STEPS.length - 1;
                const inner = (
                  <>
                    <View
                      style={[
                        styles.stepNum,
                        { backgroundColor: last ? 'rgba(255,255,255,0.2)' : STEP_TINTS[i][0] },
                      ]}
                    >
                      <Text style={[styles.stepNumText, ff.bold, { color: last ? '#FFFFFF' : STEP_TINTS[i][1] }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: wide ? undefined : 1, gap: 4 }}>
                      <Text style={[styles.stepTitle, ff.bold, last && { color: '#FFFFFF' }]}>{step.title}</Text>
                      <Text style={[styles.stepText, ff.text, last && { color: 'rgba(255,255,255,0.92)' }]}>{step.text}</Text>
                    </View>
                  </>
                );
                const layout: ViewStyle = wide
                  ? { flex: 1, padding: 22, gap: 12 }
                  : { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 };
                return last ? (
                  <LinearGradient
                    key={step.title}
                    colors={[Brand.framboise, Brand.lavande]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.stepCard, layout]}
                  >
                    {inner}
                  </LinearGradient>
                ) : (
                  <View key={step.title} style={[styles.stepCard, styles.stepCardWhite, layout]}>
                    {inner}
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </View>

        {/* Le pacte anti-ghosting */}
        <View onLayout={mark('pacte')} style={[container, { paddingBottom: sectionGap, paddingHorizontal: wide ? padX : 12 }]}>
          <LinearGradient
            colors={[Brand.nuit, '#4B3AA6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.pactBox, { padding: wide ? 56 : 22, paddingVertical: wide ? 64 : 34, borderRadius: wide ? 40 : 30 }]}
          >
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 56 : 22 }}>
              <View style={{ flex: wide ? 0.9 : undefined, gap: 14 }}>
                <Text style={[styles.overline, ff.bold, { color: '#CFC3FF' }]}>NOTRE ENGAGEMENT</Text>
                <Text style={[h2, { color: '#FFFFFF' }]}>
                  Le pacte anti-ghosting : <Text style={[ff.titleItalic, { color: '#FFB8D4' }]}>personne ne reste sans réponse.</Text>
                </Text>
                <Text style={[styles.body, ff.text, { color: 'rgba(255,255,255,0.86)' }]}>
                  En vous engageant dans un parcours, vous promettez d’aller au bout ou d’y mettre fin poliment. BOLIGO veille au respect de ce pacte.
                </Text>
              </View>
              <View style={{ flex: wide ? 1.1 : undefined, flexDirection: tablet ? 'row' : 'column', flexWrap: 'wrap', gap: 14 }}>
                {PACT.map((item, i) => (
                  <View key={item.title} style={[styles.pactItem, { width: tablet ? '48%' : '100%' }]}>
                    <View style={styles.pactNum}>
                      <Text style={[styles.pactNumText, ff.bold]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.pactTitle, ff.bold]}>{item.title}</Text>
                    <Text style={[styles.pactText, ff.text]}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Notre approche */}
        <View style={[container, { paddingBottom: sectionGap, gap: wide ? 40 : 16 }]}>
          <Text style={[h2, { maxWidth: 760 }]}>
            Pensé pour celles et ceux qui veulent <Text style={[ff.titleItalic, { color: Brand.framboise }]}>construire.</Text>
          </Text>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 24 : 12 }}>
            <ValueCard ff={ff} wide={wide} tint={Brand.rose} border={Brand.bordRose} icon={<EyeOffIcon />} title="Ni photos, ni swipe">
              On ne juge pas un visage en une seconde. On découvre une personne, ses valeurs et ce qu’elle cherche.
            </ValueCard>
            <ValueCard ff={ff} wide={wide} tint={Brand.lilas} border={Brand.bordLilas} icon={<RingsIcon />} title="Une compatibilité réelle">
              Engagement, enfants, foi, argent, quotidien : chaque point est comparé, et les sujets sensibles vous sont signalés.
            </ValueCard>
            <ValueCard ff={ff} wide={wide} tint={Brand.ciel} border={Brand.bordCiel} icon={<ShieldIcon />} title="Une messagerie modérée">
              Les messages sont vérifiés pour écarter les propos déplacés, et vous pouvez signaler un comportement en un geste.
            </ValueCard>
          </View>
        </View>

        {/* Tarif */}
        <View
          onLayout={mark('tarif')}
          style={[container, { paddingBottom: sectionGap, flexDirection: wide ? 'row' : 'column', gap: wide ? 56 : 14, alignItems: wide ? 'center' : 'stretch' }]}
        >
          <View style={{ flex: wide ? 1 : undefined, gap: 14 }}>
            <Text style={[styles.overline, ff.bold, { color: Brand.lavande }]}>TARIF SIMPLE</Text>
            <Text style={h2}>
              Vous ne payez que lorsqu’une rencontre <Text style={[ff.titleItalic, { color: Brand.framboise }]}>commence.</Text>
            </Text>
            {tablet && (
              <Text style={[styles.body, ff.text]}>
                Inscription, Grand Entretien et Découverte sont gratuits. Le Parcours Harmonie se règle au moment où vous invitez quelqu’un ou acceptez une invitation.
              </Text>
            )}
          </View>
          <View style={{ flex: wide ? 1.1 : undefined, flexDirection: tablet ? 'row' : 'column', gap: tablet ? 20 : 12 }}>
            <View style={[styles.priceCard, { flex: tablet ? 1 : undefined }]}>
              <Text style={[styles.priceLabel, ff.bold]}>Pour commencer</Text>
              <Text style={[styles.price, ff.title, { fontSize: wide ? 58 : 44 }]}>0 €</Text>
              <Text style={[styles.body, ff.text]}>Inscription, entretien et profils compatibles.</Text>
            </View>
            <LinearGradient
              colors={[Brand.framboise, Brand.lavande]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.priceBorder, { flex: tablet ? 1 : undefined }]}
            >
              <View style={styles.priceInner}>
                <Text style={[styles.priceLabel, ff.bold, { color: Brand.framboise }]}>Parcours Harmonie</Text>
                <Text style={[styles.price, ff.title, { fontSize: wide ? 58 : 44 }]}>15 €</Text>
                <Text style={[styles.body, ff.text]}>Un parcours complet avec une personne. Crédit rendu si elle ne donne plus de nouvelles.</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Questions */}
        <View onLayout={mark('questions')} style={[container, { maxWidth: 880, paddingBottom: sectionGap, gap: wide ? 28 : 14 }]}>
          <Text style={[h2, { textAlign: wide ? 'center' : 'left' }]}>Vos questions</Text>
          <View style={{ gap: 10 }}>
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} ff={ff} />
            ))}
          </View>
        </View>

        {/* Appel final */}
        <View style={[container, { paddingBottom: wide ? 96 : 40, paddingHorizontal: wide ? padX : 12 }]}>
          <LinearGradient
            colors={[Brand.framboise, Brand.lavande, Brand.nuit]}
            locations={[0, 0.6, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ctaBox, { paddingVertical: wide ? 88 : 44, borderRadius: wide ? 40 : 30 }]}
          >
            <View style={[styles.ctaCircle, { top: -120, left: -80, width: 360, height: 360 }]} />
            <View style={[styles.ctaCircle, { bottom: -160, right: -60, width: 420, height: 420, opacity: 0.6 }]} />
            <Text style={[styles.ctaTitle, ff.title, { fontSize: wide ? 58 : 34, lineHeight: wide ? 64 : 38 }]}>
              Votre BOLIGO, c’est <Text style={ff.titleItalic}>la bonne personne.</Text>
            </Text>
            {tablet && (
              <Text style={[styles.ctaText, ff.text]}>
                Créez votre profil en quelques minutes, répondez au Grand Entretien, et découvrez les personnes qui vous ressemblent.
              </Text>
            )}
            <Pressable onPress={start} accessibilityRole="button" style={[styles.ctaButton, !tablet && { alignSelf: 'stretch' }]}>
              <Text style={[styles.ctaButtonText, ff.bold]}>Commencer gratuitement</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <View style={[container, { flexDirection: tablet ? 'row' : 'column', justifyContent: 'space-between', alignItems: tablet ? 'center' : 'flex-start', gap: 14 }]}>
            <Logo ff={ff} size={20} />
            <View style={styles.footerLinks}>
              <Pressable onPress={() => router.push('/legal/cgu' as never)} accessibilityRole="link">
                <Text style={[styles.footerLink, ff.medium]}>Conditions d’utilisation</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/legal/confidentialite' as never)} accessibilityRole="link">
                <Text style={[styles.footerLink, ff.medium]}>Confidentialité</Text>
              </Pressable>
              <Pressable onPress={login} accessibilityRole="link">
                <Text style={[styles.footerLink, ff.medium]}>J’ai déjà un compte</Text>
              </Pressable>
            </View>
            <Text style={[styles.footerLink, ff.text]}>© {new Date().getFullYear()} BOLIGO</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Logo({ ff, size }: { ff: LandingFonts; size: number }) {
  return (
    <View style={styles.logo} accessibilityRole="header" accessibilityLabel="BOLIGO">
      <RingsLogo height={size} />
      <Text style={[styles.logoText, ff.title, { fontSize: size }]}>BOLIGO</Text>
    </View>
  );
}

/** Deux anneaux entrelacés (alliances), framboise et lavande. */
function RingsLogo({ height }: { height: number }) {
  const r = 9;
  const arc = (a: number) => `${13 + r * Math.cos(a)} ${14 + r * Math.sin(a)}`;
  return (
    <Svg width={height * 1.3} height={height} viewBox="0 0 36 28">
      <Circle cx={13} cy={14} r={r} fill="none" stroke={Brand.framboise} strokeWidth={2.6} />
      <Circle cx={23} cy={14} r={r} fill="none" stroke={Brand.lavande} strokeWidth={2.6} />
      <Path d={`M ${arc(-1.2)} A ${r} ${r} 0 0 1 ${arc(-0.35)}`} fill="none" stroke={Brand.framboise} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

function Blob({ color, size, style }: { color: string; size: number; style: ViewStyle }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.blob,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as ViewStyle) : { opacity: 0.6 },
        style,
      ]}
    />
  );
}

function PrimaryButton({
  label,
  onPress,
  ff,
  small,
  arrow,
  testID,
}: {
  label: string;
  onPress: () => void;
  ff: LandingFonts;
  small?: boolean;
  arrow?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [styles.primary, small && styles.primarySmall, pressed && { opacity: 0.9 }]}
    >
      <Text style={[styles.primaryText, ff.bold, small && { fontSize: 15 }]}>{label}</Text>
      {arrow && (
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
      )}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, ff }: { label: string; onPress: () => void; ff: LandingFonts }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }]}>
      <Text style={[styles.secondaryText, ff.bold]}>{label}</Text>
    </Pressable>
  );
}

function CheckBadge() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11} fill={Brand.lilas} />
      <Path d="M7 12.5l3 3 7-7" fill="none" stroke={Brand.lavande} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ValueCard({
  ff,
  wide,
  tint,
  border,
  icon,
  title,
  children,
}: {
  ff: LandingFonts;
  wide: boolean;
  tint: string;
  border: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.valueCard,
        { borderColor: border, flex: wide ? 1 : undefined, padding: wide ? 30 : 20 },
        !wide && { flexDirection: 'row', gap: 14 },
      ]}
    >
      <View style={[styles.valueIcon, { backgroundColor: tint }]}>{icon}</View>
      <View style={{ flex: wide ? undefined : 1, gap: 6 }}>
        <Text style={[styles.valueTitle, ff.bold]}>{title}</Text>
        <Text style={[styles.body, ff.text]}>{children}</Text>
      </View>
    </View>
  );
}

function FaqItem({ q, a, ff }: { q: string; a: string; ff: LandingFonts }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.faq}>
      <View style={styles.faqHead}>
        <Text style={[styles.faqQ, ff.bold]}>{q}</Text>
        <Text style={[styles.faqSign, ff.bold]}>{open ? '−' : '+'}</Text>
      </View>
      {open && <Text style={[styles.body, ff.text, { marginTop: 10 }]}>{a}</Text>}
    </Pressable>
  );
}

const iconProps = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const EyeOffIcon = () => (
  <Svg {...iconProps} stroke={Brand.framboise}>
    <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <Path d="M3 3l18 18" />
  </Svg>
);
const RingsIcon = () => (
  <Svg {...iconProps} stroke={Brand.lavande}>
    <Circle cx={9} cy={12} r={6} />
    <Circle cx={15} cy={12} r={6} />
  </Svg>
);
const ShieldIcon = () => (
  <Svg {...iconProps} stroke={Brand.nuit}>
    <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <Path d="M8.5 12l2.5 2.5 4.5-5" />
  </Svg>
);

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Brand.fond },
  heroWrap: { position: 'relative', overflow: 'hidden' },
  blob: { position: 'absolute' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 16, zIndex: 2 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { color: Brand.encre, letterSpacing: 0.6 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  navLink: { fontSize: 15, color: Brand.encre },
  loginPill: {
    backgroundColor: Brand.blanc,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: '#501E5A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  loginPillText: { fontSize: 14, color: Brand.framboise },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.blanc,
    borderWidth: 1,
    borderColor: Brand.rose,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, color: Brand.framboise },
  h1: { color: Brand.encre, letterSpacing: -1.2 },
  h2: { color: Brand.encre, letterSpacing: -0.8 },
  lead: { color: Brand.encreDouce, maxWidth: 560 },
  body: { fontSize: 16, lineHeight: 25, color: Brand.encreDouce },
  small: { fontSize: 14, color: Brand.encreDouce },
  note: { fontSize: 13, color: Brand.encrePale },
  overline: { fontSize: 12, letterSpacing: 2 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.framboise,
    paddingVertical: 17,
    paddingHorizontal: 30,
    borderRadius: 999,
    shadowColor: Brand.framboise,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  primarySmall: { paddingVertical: 12, paddingHorizontal: 22, shadowOpacity: 0 },
  primaryText: { color: '#FFFFFF', fontSize: 17 },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.blanc,
    borderWidth: 1.5,
    borderColor: Brand.lilas,
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  secondaryText: { color: Brand.nuit, fontSize: 17 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontSize: 14, color: Brand.encreDouce },
  personCard: { borderRadius: 26, gap: 14 },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  personInitial: { color: '#FFFFFF', fontSize: 22 },
  personName: { fontSize: 16, color: Brand.encre },
  personQuote: { color: Brand.encre },
  journeyBox: {},
  stepCard: { borderRadius: 22 },
  stepCardWhite: { backgroundColor: Brand.blanc },
  stepNum: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 17 },
  stepTitle: { fontSize: 17, color: Brand.encre },
  stepText: { fontSize: 14, lineHeight: 21, color: Brand.encreDouce },
  pactBox: {},
  pactItem: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 22, padding: 20, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  pactNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  pactNumText: { color: '#FFFFFF', fontSize: 15 },
  pactTitle: { color: '#FFFFFF', fontSize: 17 },
  pactText: { color: 'rgba(255,255,255,0.84)', fontSize: 15, lineHeight: 23 },
  valueCard: { backgroundColor: Brand.blanc, borderWidth: 1, borderRadius: 26, gap: 14 },
  valueIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  valueTitle: { fontSize: 19, color: Brand.encre },
  priceCard: { backgroundColor: Brand.blanc, borderWidth: 1, borderColor: Brand.bordRose, borderRadius: 26, padding: 28, gap: 8 },
  priceBorder: { borderRadius: 26, padding: 2 },
  priceInner: { backgroundColor: Brand.blanc, borderRadius: 24, padding: 26, gap: 8, flex: 1 },
  priceLabel: { fontSize: 15, color: Brand.encreDouce },
  price: { color: Brand.encre, lineHeight: 64 },
  faq: { backgroundColor: Brand.blanc, borderWidth: 1, borderColor: Brand.bordRose, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 22 },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  faqQ: { flex: 1, fontSize: 17, color: Brand.encre },
  faqSign: { fontSize: 22, color: Brand.framboise },
  ctaBox: { overflow: 'hidden', alignItems: 'center', paddingHorizontal: 24, gap: 22 },
  ctaCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  ctaTitle: { color: '#FFFFFF', textAlign: 'center', maxWidth: 820 },
  ctaText: { color: 'rgba(255,255,255,0.92)', fontSize: 18, lineHeight: 28, textAlign: 'center', maxWidth: 560 },
  ctaButton: { backgroundColor: Brand.blanc, paddingVertical: 17, paddingHorizontal: 34, borderRadius: 999, alignItems: 'center' },
  ctaButtonText: { color: Brand.framboise, fontSize: 17 },
  footer: { backgroundColor: Brand.lilas, paddingVertical: 30 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
  footerLink: { fontSize: 14, color: Brand.encreDouce },
});
