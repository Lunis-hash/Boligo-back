import { ReactNode, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Brand } from '@/constants/brand';
import { LandingFonts } from '@/components/landing/fonts';
import { captureReferralFromLocation, PartnerReferral } from '@/services/partnerReferral';
import {
  fetchOffers,
  offerClickUrl,
  OfferPlacement,
  PartnerOffer,
  recordOfferImpressions,
} from '@/services/partnerOffers';

/** Ouvre l'offre chez la marque (nouvel onglet sur le web). */
function openOffer(id: string) {
  const url = offerClickUrl(id);
  if (Platform.OS === 'web') {
    (globalThis as any).open?.(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url).catch(() => undefined);
}

/**
 * Carte d'offre. La mention « Publicité » rend le caractère commercial
 * identifiable (article 20 de la LCEN).
 */
export function OfferCard({ offer, ff, featured }: { offer: PartnerOffer; ff: LandingFonts; featured?: boolean }) {
  return (
    <View style={[styles.card, featured && styles.cardFeatured]} testID={`offer-${offer.id}`}>
      <View style={styles.cardTop}>
        <Text style={[styles.brand, ff.bold]}>{offer.brand}</Text>
        <Text style={[styles.adTag, ff.semi]}>Publicité</Text>
      </View>
      <Text style={[styles.perk, ff.title]}>{offer.perk}</Text>
      <Text style={[styles.title, ff.semi]}>{offer.title}</Text>
      <Text style={[styles.desc, ff.text]}>{offer.description}</Text>
      {offer.perkCode ? (
        <Text style={[styles.code, ff.medium]}>
          Code : <Text style={ff.bold}>{offer.perkCode}</Text>
        </Text>
      ) : null}
      <Pressable
        onPress={() => openOffer(offer.id)}
        accessibilityRole="link"
        accessibilityLabel={`Voir l’offre ${offer.brand}`}
        style={styles.cta}
        testID={`offer-go-${offer.id}`}
      >
        <Text style={[styles.ctaText, ff.bold]}>Voir l’offre</Text>
      </Pressable>
    </View>
  );
}

/** Charge les offres d'un emplacement et compte leur affichage. */
export function usePartnerOffers(placement?: OfferPlacement) {
  const [offers, setOffers] = useState<PartnerOffer[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetchOffers(placement).then((list) => {
      if (!alive) return;
      setOffers(list);
      if (list.length) recordOfferImpressions(list.map((o) => o.id));
    });
    return () => {
      alive = false;
    };
  }, [placement]);
  return offers;
}

/** « Partenaire du mois » sur la page d'accueil : n'apparaît que s'il y a une offre. */
export function PartnerOfMonthSection({
  ff,
  wide,
  title,
  style,
}: {
  ff: LandingFonts;
  wide: boolean;
  title: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const offers = usePartnerOffers('PARTENAIRE_DU_MOIS');
  if (!offers || offers.length === 0) return null;
  return (
    <View style={[{ gap: wide ? 24 : 14 }, style]} testID="partner-of-month">
      {title}
      <View style={{ flexDirection: wide ? 'row' : 'column', justifyContent: 'center', gap: 16 }}>
        {offers.slice(0, 3).map((offer) => (
          <View key={offer.id} style={wide ? { flex: 1, maxWidth: 560 } : undefined}>
            <OfferCard offer={offer} ff={ff} featured />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Bandeau « Recommandé par … » pour un visiteur arrivé par un lien partenaire. */
export function ReferralBanner({ ff }: { ff: LandingFonts }) {
  const [referral, setReferral] = useState<PartnerReferral | null>(null);
  useEffect(() => {
    let alive = true;
    captureReferralFromLocation().then((r) => alive && setReferral(r));
    return () => {
      alive = false;
    };
  }, []);
  if (!referral) return null;
  return (
    <View style={styles.banner} testID="referral-banner">
      <Text style={[styles.bannerText, ff.semi]}>
        Recommandé par <Text style={ff.bold}>{referral.partnerName}</Text> : {referral.discount} sur votre premier
        parcours, appliqué au paiement.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.blanc,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.bordLilas,
    padding: 20,
    gap: 8,
  },
  cardFeatured: { borderColor: Brand.rose, borderWidth: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  brand: { fontSize: 14, color: Brand.lavande, flexShrink: 1 },
  adTag: {
    fontSize: 11,
    color: Brand.encreDouce,
    backgroundColor: Brand.lilas,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  perk: { fontSize: 26, color: Brand.framboise },
  title: { fontSize: 16, color: Brand.encre },
  desc: { fontSize: 14, lineHeight: 21, color: Brand.encreDouce },
  code: { fontSize: 14, color: Brand.encre },
  cta: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: Brand.framboise,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: { color: Brand.blanc, fontSize: 14 },
  banner: {
    backgroundColor: Brand.nuit,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bannerText: { color: Brand.blanc, fontSize: 14, textAlign: 'center' },
});
