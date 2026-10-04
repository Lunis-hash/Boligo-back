import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import legal from '@/constants/legal.json';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Brand } from '@/constants/brand';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-10-04 » → « 4 octobre 2026 ». */
export function formatLegalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d || m > 12) return iso;
  return `${d === 1 ? '1er' : d} ${MOIS[m - 1]} ${y}`;
}

export type LegalDocKey = 'cgu' | 'privacy';

/** Affiche un texte légal (CGU ou politique de confidentialité) depuis constants/legal.json. */
export function LegalDocument({ doc }: { doc: LegalDocKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = legal[doc];

  return (
    <View style={styles.container} testID={`legal-${doc}`}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          testID="legal-back"
        >
          <ArrowLeft size={22} color={Brand.encre} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {data.shortTitle}
        </Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.version}>Version du {formatLegalDate(legal.version)}</Text>
        <Text style={styles.intro}>{data.intro}</Text>
        {data.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph, i) => (
              <Text key={i} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.fond },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.bordRose,
    backgroundColor: Brand.blanc,
  },
  headerTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: 16, color: Brand.encre },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 24, width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { fontFamily: Typography.fontFamily.serif, fontSize: 28, lineHeight: 34, color: Brand.encre },
  version: { fontFamily: Typography.fontFamily.semiBold, fontSize: 12, color: Brand.framboise, marginTop: 8, marginBottom: 16, letterSpacing: 0.3 },
  intro: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 22, color: Colors.text.primary70, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: Typography.fontFamily.serifBold, fontSize: 17, lineHeight: 23, color: Brand.nuit, marginBottom: 8 },
  paragraph: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 22, color: Colors.text.primary70, marginBottom: 8 },
});
