import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Brand } from '@/constants/brand';
import type { LandingFonts } from './fonts';

/**
 * Aperçu de l'application dans l'en-tête : une fiche d'exemple sans photo,
 * une question du Sondeur, un message et l'appel vidéo de 7 minutes.
 */
export function Showcase({ wide, ff }: { wide: boolean; ff: LandingFonts }) {
  const profile = <ProfileCard ff={ff} />;
  const sondeur = (
    <View style={[styles.sondeur, wide ? styles.sondeurWide : styles.sondeurNarrow]}>
      <Text style={[styles.overline, ff.bold, { color: Brand.lavande }]}>SONDEUR · JOUR 2</Text>
      <Text style={[styles.sondeurQuestion, ff.title, { fontSize: wide ? 20 : 18 }]}>
        Un dimanche idéal, pour vous, ressemble à quoi&nbsp;?
      </Text>
      <Text style={[styles.small, ff.text]}>Vous avez répondu tous les deux</Text>
    </View>
  );
  const bubble = (
    <View style={[styles.bubble, wide && styles.bubbleWide]}>
      <Text style={[styles.bubbleText, ff.medium]}>J’ai beaucoup aimé votre réponse sur la famille.</Text>
    </View>
  );
  const video = (
    <View style={[styles.video, wide && styles.videoWide]}>
      <View style={styles.videoIcon}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Rect x={2} y={6} width={14} height={12} rx={3} />
          <Path d="M16 10l6-3v10l-6-3z" />
        </Svg>
      </View>
      <View>
        <Text style={[styles.videoTitle, ff.bold]}>Appel vidéo · 7:00</Text>
        <Text style={[styles.videoSub, ff.text]}>Prêts tous les deux</Text>
      </View>
    </View>
  );

  if (!wide) {
    return (
      <View>
        {profile}
        {sondeur}
        {video}
      </View>
    );
  }
  return (
    <View style={styles.stage}>
      <View style={styles.profileWide}>{profile}</View>
      {sondeur}
      {bubble}
      {video}
    </View>
  );
}

function ProfileCard({ ff }: { ff: LandingFonts }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={[styles.overline, ff.bold, { color: Brand.encrePale }]}>EXEMPLE DE FICHE</Text>
        <Text style={[styles.chip, ff.bold, { color: Brand.framboise, backgroundColor: Brand.rose }]}>Sans photo</Text>
      </View>
      <View style={styles.identity}>
        <LinearGradient colors={[Brand.framboise, Brand.lavande]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Text style={[styles.avatarLetter, ff.title]}>A</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, ff.title]}>Awa, 31 ans</Text>
          <Text style={[styles.small, ff.text]}>Architecte · Lyon</Text>
        </View>
        <View style={styles.ring}>
          <Svg width={68} height={68} viewBox="0 0 74 74">
            <Circle cx={37} cy={37} r={31} fill="none" stroke={Brand.lilas} strokeWidth={7} />
            <Circle
              cx={37}
              cy={37}
              r={31}
              fill="none"
              stroke={Brand.framboise}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset={33}
              transform="rotate(-90 37 37)"
            />
          </Svg>
          <Text style={[styles.ringValue, ff.bold]}>83 %</Text>
        </View>
      </View>
      <Text style={[styles.quote, ff.titleItalic]}>
        «&nbsp;Je cherche un engagement sincère, construit à deux, avec quelqu’un qui aime les longues conversations.&nbsp;»
      </Text>
      <View style={styles.chips}>
        <Text style={[styles.chip, ff.semi, { color: Brand.framboise, backgroundColor: Brand.rose }]}>Engagement 92 %</Text>
        <Text style={[styles.chip, ff.semi, { color: Brand.lavande, backgroundColor: Brand.lilas }]}>Projet de couple 88 %</Text>
        <Text style={[styles.chip, ff.semi, { color: Brand.nuit, backgroundColor: Brand.ciel }]}>Quotidien 71 %</Text>
      </View>
    </View>
  );
}

const shadow = (color: string, radius: number, opacity: number, y: number) => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: y },
  elevation: Math.round(radius / 4),
});

const styles = StyleSheet.create({
  stage: { position: 'relative', height: 590, width: '100%' },
  profileWide: { position: 'absolute', top: 0, left: 30, right: 40 },
  card: {
    backgroundColor: Brand.blanc,
    borderRadius: 28,
    padding: 26,
    gap: 18,
    ...shadow('#501E5A', 40, 0.18, 24),
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { fontSize: 11, letterSpacing: 1.4 },
  chip: { fontSize: 12, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 28 },
  name: { fontSize: 24, color: Brand.encre },
  small: { fontSize: 14, color: Brand.encreDouce },
  ring: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  ringValue: { position: 'absolute', fontSize: 15, color: Brand.encre },
  quote: { fontSize: 19, lineHeight: 28, color: Brand.encre },
  sondeur: {
    backgroundColor: Brand.lilas,
    borderRadius: 22,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Brand.blanc,
    ...shadow('#3C2878', 30, 0.18, 18),
  },
  sondeurWide: { position: 'absolute', top: 404, right: 0, width: 290 },
  sondeurNarrow: { marginTop: -16, marginLeft: 44 },
  sondeurQuestion: { color: Brand.encre, lineHeight: 26 },
  bubble: {
    backgroundColor: Brand.framboise,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...shadow(Brand.framboise, 24, 0.3, 14),
  },
  bubbleWide: { position: 'absolute', top: 420, left: 0, width: 240 },
  bubbleText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  video: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: Brand.nuit,
    borderRadius: 999,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow(Brand.nuit, 24, 0.3, 14),
  },
  videoWide: { position: 'absolute', top: 516, left: 40, marginTop: 0 },
  videoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: { color: '#FFFFFF', fontSize: 15 },
  videoSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
});
