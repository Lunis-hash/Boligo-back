import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSegments } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Heart, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Brand } from '@/constants/brand';
import { Typography } from '@/constants/theme';

/**
 * Présentation sur ordinateur. L'app est pensée pour le téléphone : sur un
 * grand écran, ses écrans s'affichent dans une colonne centrée, accompagnée
 * d'un panneau de marque à gauche, au lieu de s'étirer sur toute la largeur.
 * La page d'accueil et les textes légaux gardent leur mise en page propre.
 */

/** En dessous : affichage plein écran, comme sur téléphone. */
const COLUMN_FROM = 760;
/** Au-dessus : panneau de marque à gauche de la colonne. */
const PANEL_FROM = 1100;
const COLUMN_WIDTH = 600;

const SECTIONS: Record<string, { title: string; text: string }> = {
  '(auth)': {
    title: 'Des rencontres sérieuses, pensées pour durer.',
    text: 'Retrouvez votre parcours là où vous l’avez laissé.',
  },
  onboarding: {
    title: 'Une rencontre qui commence par vous.',
    text: 'Quelques informations, puis le Grand Entretien : BOLIGO apprend à vous connaître avant de vous présenter qui que ce soit.',
  },
  interview: {
    title: 'Le Grand Entretien.',
    text: 'Onze modules pour cerner ce qui compte vraiment pour vous. Vos réponses servent à calculer vos compatibilités ; votre nom reste privé.',
  },
  '(tabs)': {
    title: 'Votre parcours BOLIGO.',
    text: 'Trois jours de questions, trois jours de conversation, puis sept minutes en vidéo. Une seule rencontre à la fois.',
  },
  profile: {
    title: 'Votre profil.',
    text: 'Ce que les autres membres découvrent de vous, et ce qui reste privé.',
  },
  'video-call': {
    title: 'Le face-à-face.',
    text: 'Sept minutes pour mettre un visage sur vos échanges.',
  },
};

const POINTS = [
  { Icon: Heart, text: 'Une seule rencontre à la fois' },
  { Icon: ShieldCheck, text: 'Pacte anti-ghosting : votre crédit est rendu si l’autre disparaît' },
  { Icon: Sparkles, text: 'Des profils sans photo : on se découvre par les valeurs' },
];

const FULL_WIDTH_SECTIONS = new Set(['legal', 'partenaires', 'partners']);

export function DesktopShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const segments = useSegments();
  const section = segments[0] as string | undefined;

  // Téléphone, application native, page d'accueil ou textes légaux : rien ne change.
  if (Platform.OS !== 'web' || width < COLUMN_FROM || !section || FULL_WIDTH_SECTIONS.has(section)) {
    return <>{children}</>;
  }

  const copy = SECTIONS[section] ?? SECTIONS['(tabs)'];
  const withPanel = width >= PANEL_FROM;

  return (
    <View style={styles.page}>
      {withPanel ? (
        <LinearGradient
          colors={[Brand.framboise, Brand.lavande, Brand.nuit]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.panel}
        >
          <View style={styles.brandRow} accessibilityRole="header" accessibilityLabel="BOLIGO">
            <WhiteRings />
            <Text style={styles.brandName}>BOLIGO</Text>
          </View>

          <View style={styles.panelBody}>
            <Text style={styles.panelTitle}>{copy.title}</Text>
            <Text style={styles.panelText}>{copy.text}</Text>
            <View style={styles.points}>
              {POINTS.map(({ Icon, text }) => (
                <View key={text} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <Icon size={16} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text style={styles.pointText}>{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.panelFooter}>Paiement unique · Sans abonnement · Rencontres sérieuses</Text>
        </LinearGradient>
      ) : null}

      <View style={styles.stage}>
        <View style={styles.column}>{children}</View>
      </View>
    </View>
  );
}

/** Les deux anneaux de la marque, en blanc sur le dégradé. */
function WhiteRings() {
  return (
    <Svg width={36} height={28} viewBox="0 0 36 28">
      <Circle cx={13} cy={14} r={9} fill="none" stroke="#FFFFFF" strokeWidth={2.6} />
      <Circle cx={23} cy={14} r={9} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.6} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: 'row', backgroundColor: Brand.fond },
  panel: {
    width: '38%',
    maxWidth: 560,
    minWidth: 400,
    paddingHorizontal: 56,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandName: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 24,
    letterSpacing: 3,
    color: '#FFFFFF',
  },
  panelBody: { maxWidth: 440 },
  panelTitle: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 40,
    lineHeight: 48,
    color: '#FFFFFF',
    marginBottom: 18,
  },
  panelText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    lineHeight: 25,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 32,
  },
  points: { gap: 16 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14.5,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  panelFooter: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
  },
  stage: { flex: 1, alignItems: 'center', backgroundColor: Brand.fond },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: COLUMN_WIDTH,
    backgroundColor: Brand.blanc,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Brand.bordRose,
    shadowColor: Brand.nuit,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
});
