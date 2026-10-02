import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import legal from '@/constants/legal.json';
import { Colors, Spacing, Typography } from '@/constants/theme';

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
          <ArrowLeft size={22} color={Colors.text.primary100} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {data.shortTitle}
        </Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.version}>Version du {legal.version}</Text>
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
  container: { flex: 1, backgroundColor: Colors.neutral.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.text.primary100 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 20 },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: 22, lineHeight: 28, color: Colors.text.primary100 },
  version: { fontFamily: Typography.fontFamily.regular, fontSize: 12, color: Colors.text.primary40, marginTop: 6, marginBottom: 16 },
  intro: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 22, color: Colors.text.primary70, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 15, lineHeight: 21, color: Colors.text.primary100, marginBottom: 8 },
  paragraph: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 22, color: Colors.text.primary70, marginBottom: 8 },
});
