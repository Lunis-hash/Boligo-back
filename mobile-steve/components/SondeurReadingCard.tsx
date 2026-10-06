import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MessageCircle, Sparkles } from 'lucide-react-native';
import { Brand } from '@/constants/brand';
import { Typography } from '@/constants/theme';
import { SondeurReading, readingCaption } from '@/services/sondeurInsights';

/**
 * Lecture d'une journée du Sondeur (ou bilan Harmonie) : accords, nuances à
 * explorer et une question pour en parler. Le bilan propose aussi des premiers
 * messages pour le chat.
 */
export function SondeurReadingCard({
  reading,
  review = false,
  style,
}: {
  reading: SondeurReading;
  review?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const testID = review ? 'sondeur-review' : `sondeur-reading-${reading.day}`;
  return (
    <View style={[styles.card, review ? styles.review : styles.day, style]} testID={testID}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: review ? Brand.framboise : Brand.lavande }]}>
          <Sparkles size={14} color="#FFFFFF" />
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.kicker}>{review ? 'Bilan Harmonie' : `Lecture du jour ${reading.day}`}</Text>
          <Text style={styles.caption}>{readingCaption(reading)}</Text>
        </View>
      </View>

      <Text style={styles.headline}>{reading.headline}</Text>

      {reading.together.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.label}>{review ? 'Vos points forts' : 'Ce qui vous rapproche'}</Text>
          {reading.together.map((t, i) => (
            <Text key={`t${i}`} style={styles.item}>
              • {t}
            </Text>
          ))}
        </View>
      )}

      {reading.toDiscuss.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.label}>{review ? 'À aborder en priorité' : 'À explorer ensemble'}</Text>
          {reading.toDiscuss.map((p, i) => (
            <Text key={`d${i}`} style={styles.item}>
              <Text style={styles.theme}>{p.theme} : </Text>
              {p.text}
            </Text>
          ))}
        </View>
      )}

      {reading.openers.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.label}>{review ? 'Pour votre premier message' : 'Pour en parler'}</Text>
          {reading.openers.map((o, i) => (
            <View key={`o${i}`} style={styles.opener}>
              <MessageCircle size={14} color={Brand.framboise} style={{ marginTop: 2 }} />
              <Text style={styles.openerText}>{o}</Text>
            </View>
          ))}
        </View>
      )}

      {reading.advice ? <Text style={styles.advice}>{reading.advice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  day: { backgroundColor: Brand.lilas, borderColor: Brand.bordLilas, margin: 12 },
  review: { backgroundColor: Brand.rose, borderColor: '#F7C9DC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTexts: { flex: 1 },
  kicker: { fontFamily: Typography.fontFamily.bold, fontSize: 14, color: Brand.encre },
  caption: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Brand.encrePale },
  headline: { fontFamily: Typography.fontFamily.semiBold, fontSize: 15, lineHeight: 21, color: Brand.encre },
  block: { gap: 4 },
  label: { fontFamily: Typography.fontFamily.bold, fontSize: 12, color: Brand.framboise, textTransform: 'uppercase', letterSpacing: 0.4 },
  item: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: Brand.encreDouce },
  theme: { fontFamily: Typography.fontFamily.semiBold, color: Brand.encre },
  opener: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10 },
  openerText: { flex: 1, fontFamily: Typography.fontFamily.medium, fontSize: 14, lineHeight: 20, color: Brand.encre },
  advice: { fontFamily: Typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: Brand.encreDouce, fontStyle: 'italic' },
});
