import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@/services/stripe';
import { Check, ShieldCheck, Sparkles, ChevronLeft, Tag } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { PaymentService, PaymentPlan, PromoCheckResult, paymentIntentIdFromClientSecret, selectHarmoniePlan } from '@/services/payment';
import { getReadableError } from '@/services/api';
import { Typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Palette de couleurs officielle Onboarding BOLIGO ──────────────────
const COLORS = {
  bg: '#FFFFFF',
  red: '#E8403A',
  redDark: '#C42E29',
  orange: '#E8834A',
  purple: '#7C5CE8',
  purpleDark: '#5A3AB8',
  gold: '#C89A2E',
  goldDark: '#A87C1C',
  teal: '#0F9A90',
  tealDark: '#0D7C74',
  green: '#1E9E5A',
  greenDark: '#158044',
  ink: '#14100E',
  ink2: '#5C534C',
  ink3: '#918780',
  line: 'rgba(20,16,14,0.10)',
};

/** Délai maximal d'attente du webhook Stripe avant de rendre la main (ms). */
const CREDIT_SYNC_TIMEOUT_MS = 12000;
const CREDIT_SYNC_INTERVAL_MS = 1500;

/**
 * Écran de paiement.
 * Les formules sont lues depuis le backend (GET /payment/plans) : le backend
 * ne connaît qu'un seul plan et applique 15 € / 1 crédit à tout identifiant
 * inconnu, donc aucune offre n'est définie en dur ici.
 * Le solde de crédits n'est jamais modifié localement : il est relu depuis
 * GET /credit/balance une fois le paiement (ou le code promo) confirmé.
 */
export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { credits, refreshCredits } = useAppContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoCheckResult | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const processingRef = useRef(false);

  const topPadding = Platform.OS === 'ios' ? insets.top + 4 : insets.top > 0 ? insets.top + 6 : 14;
  const bottomPadding = Math.max(insets.bottom + 20, 24);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const list = selectHarmoniePlan(await PaymentService.getPlans());
      setPlans(list);
      if (list.length === 0) setPlansError('La formule Parcours Harmonie est indisponible pour le moment.');
    } catch (e) {
      setPlansError(getReadableError(e, 'Impossible de charger les formules.'));
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const goBackToApp = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const finishWithSuccess = async (message: string, expectedMinimum: number) => {
    setPaymentSuccess(true);
    setSuccessMessage(message);
    // Le crédit est ajouté par le backend (confirmation, webhook Stripe ou code promo) :
    // on attend qu'il apparaisse dans le solde avant de rendre la main.
    const started = Date.now();
    let balance = await refreshCredits();
    while (balance < expectedMinimum && Date.now() - started < CREDIT_SYNC_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, CREDIT_SYNC_INTERVAL_MS));
      balance = await refreshCredits();
    }
    setTimeout(() => router.replace('/(tabs)'), 1200);
  };

  const handleSelectPlan = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setPromoResult(null);
    setShowCheckout(true);
  };

  const handleCheckPromo = async () => {
    if (!selectedPlan || !promoCode.trim()) return;
    setPromoChecking(true);
    try {
      const result = await PaymentService.checkPromoCode(promoCode.trim(), selectedPlan.id);
      setPromoResult(result);
      if (!result.isValid) {
        Alert.alert('Code promo', result.message || 'Code promotionnel invalide ou expiré.');
      }
    } catch (e) {
      setPromoResult(null);
      Alert.alert('Code promo', getReadableError(e));
    } finally {
      setPromoChecking(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    const expectedMinimum = credits + selectedPlan.credits;

    try {
      // 1. Offre gratuite via code promo : le backend crédite directement.
      if (promoResult?.isValid && promoResult.isFree) {
        const applied = await PaymentService.applyPromoCode(promoCode.trim(), selectedPlan.id);
        await finishWithSuccess(applied.message || 'Votre code promo a été appliqué.', expectedMinimum);
        return;
      }

      // 2. Paiement Stripe (PaymentSheet native).
      const sheet = await PaymentService.createPaymentIntent(
        selectedPlan.id,
        promoResult?.isValid ? promoCode.trim() : undefined,
      );

      if (sheet.isMock || Platform.OS === 'web') {
        Alert.alert(
          'Paiement indisponible',
          Platform.OS === 'web'
            ? "Le paiement par carte n'est disponible que dans l'application mobile."
            : "Le paiement n'est pas encore activé sur ce serveur (Stripe non configuré). Aucun crédit n'a été ajouté.",
        );
        return;
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: sheet.paymentIntent,
        customerId: sheet.customer,
        customerEphemeralKeySecret: sheet.ephemeralKey,
        merchantDisplayName: 'BOLIGO',
        defaultBillingDetails: { name: 'Client BOLIGO' },
      });
      if (initError) {
        Alert.alert('Paiement impossible', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Paiement échoué', presentError.message);
        }
        return;
      }

      // Le serveur vérifie le paiement auprès de Stripe et crédite le compte.
      // En cas d'échec réseau, le webhook Stripe (s'il est configuré) prend le
      // relais et l'attente du solde ci-dessous suffit.
      try {
        await PaymentService.confirmPayment(paymentIntentIdFromClientSecret(sheet.paymentIntent));
      } catch (confirmError) {
        console.warn('[Paiement] Confirmation serveur différée :', getReadableError(confirmError));
      }

      await finishWithSuccess('Votre paiement a été confirmé par Stripe.', expectedMinimum);
    } catch (err) {
      Alert.alert('Erreur', `Impossible d'initier le paiement : ${getReadableError(err)}`);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const amountDisplay = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  const checkoutTotal =
    promoResult?.isValid && selectedPlan ? amountDisplay(promoResult.finalAmount) : selectedPlan?.priceDisplay ?? '';

  // ═════════════════════════════════════════════════════════════════════
  // VUE RÉCAPITULATIF & CONFIRMATION STRIPE
  // ═════════════════════════════════════════════════════════════════════
  if (showCheckout && selectedPlan) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />

        <View style={[styles.checkoutHeader, { paddingTop: topPadding }]}>
          <TouchableOpacity
            onPress={() => setShowCheckout(false)}
            style={styles.backButton}
            disabled={isProcessing}
            activeOpacity={0.7}
            accessibilityLabel="Retour aux formules"
          >
            <ChevronLeft size={24} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.checkoutTitle}>Paiement Sécurisé</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.checkoutBody, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled">
          {paymentSuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successCircle}>
                <Sparkles size={56} color={COLORS.goldDark} />
              </View>
              <Text style={styles.successTitle}>Paiement Confirmé !</Text>
              <Text style={styles.successSubtitle}>
                {successMessage} Votre solde est de {credits} crédit{credits > 1 ? 's' : ''}.
              </Text>
              <ActivityIndicator size="small" color={COLORS.goldDark} style={{ marginTop: 24 }} />
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.orderSummaryCard}>
                {selectedPlan.badge ? (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>{selectedPlan.badge.toUpperCase()}</Text>
                  </View>
                ) : null}
                <Text style={styles.summarySub}>FORMULE SÉLECTIONNÉE</Text>
                <Text style={styles.summaryTitle}>{selectedPlan.name}</Text>
                <Text style={styles.summaryDesc}>{selectedPlan.description}</Text>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryTotalRow}>
                  <Text style={styles.totalLabel}>Total à régler</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalAmount}>{checkoutTotal}</Text>
                    <Text style={styles.totalPeriod}>
                      {selectedPlan.credits} crédit{selectedPlan.credits > 1 ? 's' : ''} · Paiement unique · Sans abonnement
                    </Text>
                  </View>
                </View>
              </View>

              {/* Code promo */}
              <View style={styles.promoBox}>
                <View style={styles.promoHeader}>
                  <Tag size={16} color={COLORS.goldDark} />
                  <Text style={styles.promoTitle}>{selectedPlan.promoCodes?.hint || 'Avez-vous un code promotionnel ?'}</Text>
                </View>
                <View style={styles.promoRow}>
                  <TextInput
                    style={styles.promoInput}
                    value={promoCode}
                    onChangeText={(v) => {
                      setPromoCode(v.toUpperCase());
                      setPromoResult(null);
                    }}
                    placeholder="CODE"
                    placeholderTextColor={COLORS.ink3}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isProcessing}
                    testID="promo-input"
                  />
                  <TouchableOpacity
                    onPress={handleCheckPromo}
                    disabled={!promoCode.trim() || promoChecking || isProcessing}
                    style={[styles.promoBtn, (!promoCode.trim() || promoChecking) && { opacity: 0.5 }]}
                    activeOpacity={0.8}
                    testID="promo-apply"
                  >
                    {promoChecking ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.promoBtnText}>Appliquer</Text>}
                  </TouchableOpacity>
                </View>
                {promoResult?.isValid ? (
                  <Text style={styles.promoOk}>{promoResult.message}</Text>
                ) : null}
              </View>

              <View style={styles.securityBox}>
                <View style={styles.securityIconCircle}>
                  <ShieldCheck size={28} color={COLORS.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.securityTitle}>Paiement 100% Chiffré & Sécurisé</Text>
                  <Text style={styles.securitySubtitle}>
                    Vos coordonnées bancaires sont directement chiffrées par Stripe. BOLIGO ne conserve aucune donnée de carte bancaire.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmPayment}
                disabled={isProcessing}
                style={styles.ctaRegularBtn}
                testID="pay-submit"
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.ctaRegularText}>
                    {promoResult?.isValid && promoResult.isFree ? 'Activer mon accès gratuit' : `Payer ${checkoutTotal} avec Stripe`}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCheckout(false)} disabled={isProcessing} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Modifier mon choix</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // VUE PRINCIPALE — ÉCRAN DES TARIFS
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.meshBackground} pointerEvents="none">
        <View style={[styles.blob, styles.blobGold]} />
        <View style={[styles.blob, styles.blobRed]} />
      </View>

      <View style={[styles.topbar, { paddingTop: topPadding }]}>
        <View style={styles.topbarLeft}>
          <TouchableOpacity onPress={goBackToApp} style={styles.backBtn} activeOpacity={0.7} accessibilityLabel="Retour">
            <ChevronLeft size={22} color={COLORS.ink} />
          </TouchableOpacity>
          <Text style={styles.logoText}>BOLIGO</Text>
        </View>

        <TouchableOpacity onPress={goBackToApp} activeOpacity={0.7}>
          <Text style={styles.skipText}>Plus tard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        <View style={styles.headerSection}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>CHOISIS TON PARCOURS</Text>
          </View>
          <Text style={styles.pageTitle}>
            Un parcours. <Text style={styles.pageTitleItalic}>Sept jours. Une vraie rencontre.</Text>
          </Text>
          <Text style={styles.balanceText}>Solde actuel : {credits} crédit{credits > 1 ? 's' : ''}</Text>
        </View>

        {plansLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={COLORS.red} />
            <Text style={styles.stateText}>Chargement des formules…</Text>
          </View>
        ) : plansError ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{plansError}</Text>
            <TouchableOpacity onPress={loadPlans} style={styles.standardCtaBtn} activeOpacity={0.8}>
              <Text style={styles.standardCtaText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.packGrid}>
            {plans.map((plan) => (
              <View key={plan.id} style={[styles.packStandardCard, plan.badge ? styles.packHighlightCard : null]}>
                {plan.badge ? (
                  <View style={styles.heroTagBadge}>
                    <LinearGradient colors={['#D9AE3C', '#A87C1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroTagGradient}>
                      <Text style={styles.heroTagText}>{plan.badge}</Text>
                    </LinearGradient>
                  </View>
                ) : null}
                <Text style={styles.standardPackName}>{plan.name.toUpperCase()}</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>{plan.priceDisplay}</Text>
                  <Text style={styles.pricePeriod}>
                    le parcours · {plan.credits} crédit{plan.credits > 1 ? 's' : ''}
                  </Text>
                </View>

                <Text style={styles.packDesc}>{plan.description}</Text>

                <View style={styles.featureList}>
                  {plan.features.map((feat, index) => (
                    <View key={index} style={styles.featureRow}>
                      <View style={styles.tickmarkGreen}>
                        <Check size={11} color={COLORS.green} strokeWidth={3.5} />
                      </View>
                      <Text style={styles.featureText}>
                        <Text style={styles.featureStrong}>{feat.label}</Text>
                        {feat.detail ? ` — ${feat.detail}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>

                {plan.guarantee ? <Text style={styles.guaranteeText}>🛡️ {plan.guarantee}</Text> : null}

                <TouchableOpacity activeOpacity={0.8} onPress={() => handleSelectPlan(plan)} style={styles.standardCtaBtn} testID={`plan-${plan.id}`}>
                  <Text style={styles.standardCtaText}>Choisir ce parcours</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.reassureLine}>
          <Text style={styles.reassureItem}>Paiement unique</Text>
          <Text style={styles.reassureDot}>●</Text>
          <Text style={styles.reassureBold}>Sans abonnement</Text>
          <Text style={styles.reassureDot}>●</Text>
          <Text style={styles.reassureItem}>100% Sécurisé</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════
// FEUILLE DE STYLES EXACTE ONBOARDING & CHARTE BOLIGO
// ═════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  meshBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.12,
  },
  blobGold: {
    backgroundColor: COLORS.gold,
    top: -40,
    right: -50,
  },
  blobRed: {
    backgroundColor: COLORS.red,
    bottom: -30,
    left: -40,
  },

  // Top bar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  topbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: COLORS.red,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },

  // En-tête
  headerSection: {
    marginBottom: 14,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200,154,46,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,154,46,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  badgePillText: {
    color: COLORS.goldDark,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.058, 22),
    fontWeight: '800',
    color: COLORS.ink,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontFamily: Typography.fontFamily.serif || Typography.fontFamily.bold,
  },
  pageTitleItalic: {
    fontWeight: '400',
    fontStyle: 'italic',
    color: COLORS.ink2,
  },

  // Pack Grid
  packGrid: {
    gap: 16,
    marginBottom: 20,
  },

  // Pack Standard Card
  packStandardCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 20,
  },
  standardPackName: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: COLORS.ink3,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.ink,
    lineHeight: 36,
    fontFamily: Typography.fontFamily.serif || Typography.fontFamily.bold,
  },
  pricePeriod: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.ink3,
  },
  packDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.ink2,
    marginBottom: 14,
  },

  // Feature rows
  featureList: {
    gap: 9,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  tickmarkGreen: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: 'rgba(30,158,90,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1.5,
  },
  tickmarkGold: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: 'rgba(200,154,46,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1.5,
  },
  featureText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.ink2,
  },
  featureStrong: {
    fontWeight: '700',
    color: COLORS.ink,
  },

  standardCtaBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  standardCtaText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.ink,
  },

  // Pack Hero Card (Premium)
  packHeroCard: {
    backgroundColor: 'rgba(200,154,46,0.03)',
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  heroTagBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroTagGradient: {
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroPackName: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: COLORS.goldDark,
    marginBottom: 6,
  },
  plusDividerRow: {
    paddingTop: 11,
    marginBottom: 11,
    borderTopWidth: 1,
    borderColor: 'rgba(200,154,46,0.35)',
    borderStyle: 'dashed',
  },
  plusTitleText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.goldDark,
  },
  heroCtaWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCtaBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Réassurance
  reassureLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 6,
    marginBottom: 16,
  },
  reassureItem: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.ink3,
  },
  reassureBold: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.ink2,
  },
  reassureDot: {
    fontSize: 5,
    color: '#D6CFC8',
  },

  // ═══════════════════════════════════════════════════════════════════
  // CHECKOUT MODAL STYLES
  // ═══════════════════════════════════════════════════════════════════
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.ink,
  },
  checkoutBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  formContainer: {
    flex: 1,
  },
  orderSummaryCard: {
    backgroundColor: '#FAFAF8',
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  orderSummaryHero: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(200,154,46,0.03)',
  },
  orderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.goldDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  orderBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summarySub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: COLORS.ink3,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 6,
    fontFamily: Typography.fontFamily.serif || Typography.fontFamily.bold,
  },
  summaryDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.ink2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginVertical: 14,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
    fontFamily: Typography.fontFamily.serif || Typography.fontFamily.bold,
  },
  totalPeriod: {
    fontSize: 10.5,
    color: COLORS.ink3,
    marginTop: 2,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7FDF9',
    borderWidth: 1,
    borderColor: 'rgba(30,158,90,0.2)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  securityIconCircle: {
    marginTop: 2,
  },
  securityTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 4,
  },
  securitySubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.ink2,
  },
  ctaPrimaryGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 4,
  },
  ctaPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ctaRegularBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaRegularText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.ink3,
    textDecorationLine: 'underline',
  },

  // Success
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(200,154,46,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 10,
    fontFamily: Typography.fontFamily.serif || Typography.fontFamily.bold,
  },
  successSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.ink2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Ajouts : solde, états, code promo, mise en avant
  balanceText: {
    marginTop: 10,
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.ink3,
  },
  stateBox: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 16,
    marginBottom: 20,
  },
  stateText: {
    fontSize: 13.5,
    color: COLORS.ink2,
    textAlign: 'center',
  },
  packHighlightCard: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(200,154,46,0.03)',
  },
  guaranteeText: {
    fontSize: 12,
    color: COLORS.ink2,
    marginBottom: 14,
    lineHeight: 17,
  },
  promoBox: {
    borderWidth: 1.5,
    borderColor: 'rgba(200,154,46,0.35)',
    backgroundColor: 'rgba(200,154,46,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  promoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  promoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.ink,
    backgroundColor: '#FFFFFF',
  },
  promoBtn: {
    backgroundColor: COLORS.goldDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  promoOk: { marginTop: 10, fontSize: 12.5, fontWeight: '600', color: COLORS.greenDark },
});
