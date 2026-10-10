import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { useBrandFonts } from '@/services/brandFonts';
import { landingFonts } from '@/components/landing/fonts';
import { OfferCard, usePartnerOffers } from '@/components/partners/PartnerOffers';

/**
 * Offres des marques partenaires (restaurants, sorties, bien-être…) pour
 * préparer un rendez-vous. Rien n'est transmis à la marque sur le membre.
 */
export default function OffersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ready } = useBrandFonts();
  const ff = useMemo(() => landingFonts(ready), [ready]);
  const offers = usePartnerOffers();

  return (
    <View style={styles.container} testID="offers-screen">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as never))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={Brand.encre} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offres partenaires</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.intro}>
          Des avantages choisis par BOLIGO pour vos premiers rendez-vous. En cliquant, vous quittez BOLIGO pour le site de
          la marque : elle ne reçoit aucune information sur vous.
        </Text>
        {offers === null ? (
          <ActivityIndicator color={Brand.framboise} style={{ marginTop: 24 }} />
        ) : offers.length === 0 ? (
          <Text style={styles.empty}>Aucune offre pour le moment. Revenez bientôt.</Text>
        ) : (
          <View style={{ gap: 14 }}>
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} ff={ff} featured={offer.placement === 'PARTENAIRE_DU_MOIS'} />
            ))}
          </View>
        )}
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
  content: { paddingHorizontal: Spacing.lg, paddingTop: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  intro: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 21, color: Colors.text.primary70, marginBottom: 18 },
  empty: { fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary70, marginTop: 24, textAlign: 'center' },
});
