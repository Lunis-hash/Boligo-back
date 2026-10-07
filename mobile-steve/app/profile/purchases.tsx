import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { PaymentService, Purchase } from '@/services/payment';
import { getReadableError } from '@/services/api';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function dateFr(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

const euros = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

const WITHDRAWAL_LABEL: Record<string, string> = {
  recue: 'Demande de rétractation reçue : remboursement sous 14 jours',
  remboursee: 'Rétractation : remboursé',
  refusee: 'Demande de rétractation refusée (voir l’e-mail)',
};

/**
 * Achats payés par carte : facture, et « Se rétracter du contrat ici »
 * pendant les 14 jours qui suivent le paiement.
 */
export default function PurchasesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Purchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await PaymentService.getPurchases());
    } catch (e) {
      setError(getReadableError(e, 'Impossible de charger vos achats.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openInvoice = async (p: Purchase) => {
    setBusy(`invoice:${p.paymentRef}`);
    try {
      await Linking.openURL(await PaymentService.getInvoiceUrl(p.paymentRef));
    } catch (e) {
      Alert.alert('Facture', getReadableError(e, 'Facture indisponible pour le moment.'));
    } finally {
      setBusy(null);
    }
  };

  const withdraw = (p: Purchase) => {
    Alert.alert(
      'Se rétracter du contrat',
      `Vous demandez à vous rétracter de votre achat du ${dateFr(p.paidAt)} (${euros(p.amountCents)}). Si votre crédit n’a pas servi, vous serez remboursé(e) en totalité ; sinon, du montant qui correspond à la partie non fournie du parcours.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer ma rétractation',
          style: 'destructive',
          onPress: async () => {
            setBusy(`withdraw:${p.paymentRef}`);
            try {
              await PaymentService.requestWithdrawal(p.paymentRef);
              Alert.alert('Demande reçue', 'Un accusé de réception vient de vous être envoyé par e-mail.');
              await load();
            } catch (e) {
              Alert.alert('Rétractation', getReadableError(e));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container} testID="purchases-screen">
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as never))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={Brand.encre} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes achats et factures</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : items === null ? (
          <ActivityIndicator color={Brand.framboise} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Aucun achat par carte pour le moment.</Text>
        ) : (
          items.map((p) => (
            <View key={p.paymentRef} style={styles.card} testID={`purchase-${p.paymentRef}`}>
              <View style={styles.row}>
                <Text style={styles.title}>{p.description}</Text>
                <Text style={styles.amount}>{euros(p.amountCents)} TTC</Text>
              </View>
              <Text style={styles.meta}>
                Payé le {dateFr(p.paidAt)}
                {p.invoiceNumber ? ` · Facture ${p.invoiceNumber}` : ''}
              </Text>
              {p.refundedCents > 0 ? (
                <Text style={styles.meta}>Remboursé : {euros(p.refundedCents)}</Text>
              ) : null}
              {p.withdrawal ? <Text style={styles.status}>{WITHDRAWAL_LABEL[p.withdrawal.status]}</Text> : null}

              <TouchableOpacity
                style={styles.secondary}
                onPress={() => openInvoice(p)}
                disabled={busy !== null}
                activeOpacity={0.8}
              >
                {busy === `invoice:${p.paymentRef}` ? (
                  <ActivityIndicator size="small" color={Brand.nuit} />
                ) : (
                  <Text style={styles.secondaryText}>Voir la facture</Text>
                )}
              </TouchableOpacity>

              {p.canWithdraw ? (
                <>
                  <TouchableOpacity
                    style={styles.withdraw}
                    onPress={() => withdraw(p)}
                    disabled={busy !== null}
                    activeOpacity={0.8}
                    testID="withdraw-button"
                  >
                    {busy === `withdraw:${p.paymentRef}` ? (
                      <ActivityIndicator size="small" color={Brand.framboise} />
                    ) : (
                      <Text style={styles.withdrawText}>Se rétracter du contrat ici</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.deadline}>Possible jusqu’au {dateFr(p.withdrawalDeadline)}.</Text>
                </>
              ) : null}
            </View>
          ))
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
  empty: { fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary70, marginTop: 24, textAlign: 'center' },
  card: {
    backgroundColor: Brand.blanc,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.bordRose,
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  title: { flex: 1, fontFamily: Typography.fontFamily.semiBold, fontSize: 15, color: Brand.encre },
  amount: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: Brand.nuit },
  meta: { fontFamily: Typography.fontFamily.regular, fontSize: 12.5, color: Colors.text.primary70, marginTop: 6 },
  status: { fontFamily: Typography.fontFamily.semiBold, fontSize: 12.5, color: Brand.framboise, marginTop: 8 },
  secondary: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.bordRose,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryText: { fontFamily: Typography.fontFamily.semiBold, fontSize: 14, color: Brand.nuit },
  withdraw: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.framboise,
    paddingVertical: 11,
    alignItems: 'center',
  },
  withdrawText: { fontFamily: Typography.fontFamily.semiBold, fontSize: 14, color: Brand.framboise },
  deadline: { fontFamily: Typography.fontFamily.regular, fontSize: 11.5, color: Colors.text.primary40, marginTop: 6, textAlign: 'center' },
});
