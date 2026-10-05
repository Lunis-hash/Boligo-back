import { StyleSheet, Text, View } from 'react-native';
import { Eye, HeartHandshake, MessageCircle, Smile, Waves } from 'lucide-react-native';
import { Brand } from '@/constants/brand';
import { Typography } from '@/constants/theme';
import type { RelationalProfile } from '@/services/interview';

/**
 * « Votre profil relationnel » : lecture bienveillante des échelles du Grand
 * Entretien (attachement, émotions, disputes, personnalité). Visible du seul
 * membre ; ce n'est pas un diagnostic.
 */
export function RelationalProfileCard({ profile }: { profile: RelationalProfile }) {
  const rows = [
    { Icon: HeartHandshake, label: 'Dans le lien', item: profile.attachment },
    { Icon: Waves, label: 'Vos émotions', item: profile.regulation },
    { Icon: MessageCircle, label: 'En dispute', item: profile.conflict },
    { Icon: Smile, label: 'Premiers pas', item: profile.openness ?? null },
  ].filter((r) => r.item);

  return (
    <View style={styles.card} testID="relational-profile">
      <Text style={styles.title}>Votre profil relationnel</Text>
      <Text style={styles.subtitle}>Ce que vos réponses disent de votre façon d’aimer.</Text>

      {rows.map(({ Icon, label, item }) => (
        <View key={label} style={styles.row}>
          <View style={styles.rowIcon}>
            <Icon size={16} color={Brand.lavande} strokeWidth={2} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowTitle}>{item!.title}</Text>
            <Text style={styles.rowText}>{item!.text}</Text>
          </View>
        </View>
      ))}

      {profile.personality.length > 0 && (
        <View style={styles.traits}>
          <Text style={styles.rowLabel}>Votre personnalité</Text>
          {profile.personality.map((t) => (
            <View key={t.trait} style={styles.trait}>
              <View style={styles.traitTop}>
                <Text style={styles.traitLabel}>{t.label}</Text>
                <Text style={styles.traitValue}>{t.value}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(4, Math.min(100, t.value))}%` }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      {profile.observations.length > 0 && (
        <View style={styles.observations}>
          {profile.observations.map((o) => (
            <View key={o} style={styles.observation}>
              <Eye size={14} color={Brand.framboise} strokeWidth={2} style={styles.observationIcon} />
              <Text style={styles.observationText}>{o}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>{profile.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Brand.blanc,
    borderWidth: 1,
    borderColor: Brand.bordLilas,
  },
  title: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 21,
    lineHeight: 27,
    color: Brand.encre,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: Brand.encreDouce,
    marginTop: 4,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124,92,219,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.lavande,
  },
  rowTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    lineHeight: 21,
    color: Brand.encre,
    marginTop: 2,
  },
  rowText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: Brand.encreDouce,
    marginTop: 2,
  },
  traits: { marginTop: 18, gap: 10 },
  trait: { gap: 5 },
  traitTop: { flexDirection: 'row', justifyContent: 'space-between' },
  traitLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13.5,
    color: Brand.encre,
  },
  traitValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: Brand.lavande,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(124,92,219,0.12)',
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: Brand.lavande },
  observations: { marginTop: 16, gap: 8 },
  observation: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(198,42,110,0.06)',
  },
  observationIcon: { marginTop: 2 },
  observationText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Brand.encre,
  },
  disclaimer: {
    marginTop: 16,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: Brand.encreDouce,
  },
});
