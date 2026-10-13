import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';
import { useBrandFonts } from '@/services/brandFonts';
import api from '@/services/api';
import { landingFonts } from '@/components/landing/fonts';
import { Logo } from '@/components/landing/LandingPage';
import type { PartnerLang } from './content';
import {
  PartnerSpaceData,
  SPACE_CONTENT,
  discountLabel,
  formatDay,
  formatEuro,
  formatMonth,
  readPortalToken,
} from './space-content';

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'error'; tooMany: boolean }
  | { kind: 'ready'; data: PartnerSpaceData };

function tokenFromAddress(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return readPortalToken(window.location.hash);
}

/**
 * Espace partenaire : ouvert par le lien privé reçu par e-mail. Totaux et
 * historique du code, jamais de donnée de membre.
 */
export function PartnerSpacePage({ lang: forcedLang }: { lang: PartnerLang }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready } = useBrandFonts();
  const ff = useMemo(() => landingFonts(ready), [ready]);
  const [lang, setLang] = useState<PartnerLang>(forcedLang);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [copied, setCopied] = useState<string | null>(null);
  const t = SPACE_CONTENT[lang];
  const wide = width >= 1024;
  const tablet = width >= 720;
  const container = {
    width: '100%' as const,
    maxWidth: 1080,
    alignSelf: 'center' as const,
    paddingHorizontal: wide ? 32 : 20,
  };

  const load = useCallback(async () => {
    const token = tokenFromAddress();
    if (!token) {
      setState({ kind: 'invalid' });
      return;
    }
    setState((s) => (s.kind === 'ready' ? s : { kind: 'loading' }));
    try {
      const res = await api.post<PartnerSpaceData>('/partners/portal', { token });
      setState({ kind: 'ready', data: res.data });
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404 || status === 400) setState({ kind: 'invalid' });
      else setState({ kind: 'error', tooMany: status === 429 });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 2000);
    } catch {
      setCopied(null);
    }
  };

  const data = state.kind === 'ready' ? state.data : null;
  const rate = data?.partner.commissionRate ?? null;
  const hasSales = Boolean(data && data.totals.purchases > 0);
  const code = data?.code ?? null;
  const suspended = data?.partner.status === 'SUSPENDU';

  return (
    <View style={styles.page} testID="space-page">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 32 }}>
        <LinearGradient colors={[Brand.rose, Brand.fond]} style={{ paddingBottom: wide ? 48 : 28 }}>
          <View style={[container, styles.header]}>
            <Pressable onPress={() => router.replace('/')} accessibilityRole="link" accessibilityLabel="BOLIGO">
              <Logo ff={ff} size={wide ? 26 : 22} />
            </Pressable>
            <Pressable
              onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              accessibilityRole="button"
              style={styles.langPill}
              testID="space-lang"
            >
              <Text style={[styles.langText, ff.bold]}>{t.langSwitch}</Text>
            </Pressable>
          </View>
          <View style={[container, { gap: 14, paddingTop: wide ? 32 : 12 }]}>
            <Text style={[styles.kicker, ff.bold]}>{t.kicker.toUpperCase()}</Text>
            {data && (
              <>
                <Text style={[styles.h1, ff.title, { fontSize: wide ? 46 : 32, lineHeight: wide ? 52 : 38 }]}>
                  {t.hello(data.partner.name)}
                </Text>
                <Text style={[styles.lead, ff.text, { maxWidth: 760 }]}>{code ? t.intro : t.brandIntro}</Text>
              </>
            )}
          </View>
        </LinearGradient>

        <View style={[container, { gap: 22 }]}>
          {state.kind === 'loading' && (
            <View style={styles.center} testID="space-loading">
              <ActivityIndicator color={Brand.framboise} />
              <Text style={[styles.muted, ff.text]}>{t.loading}</Text>
            </View>
          )}

          {state.kind === 'invalid' && (
            <View style={styles.card} testID="space-invalid">
              <Text style={[styles.h2, ff.title]}>{t.invalidTitle}</Text>
              <Text style={[styles.body, ff.text]}>{t.invalidText}</Text>
            </View>
          )}

          {state.kind === 'error' && (
            <View style={styles.card} testID="space-error">
              <Text style={[styles.body, ff.text]}>{state.tooMany ? t.tooMany : t.error}</Text>
              <Pressable onPress={() => void load()} accessibilityRole="button" style={styles.secondary}>
                <Text style={[styles.secondaryText, ff.bold]}>{t.refresh}</Text>
              </Pressable>
            </View>
          )}

          {data && (
            <>
              {suspended ? (
                <View style={[styles.card, { borderColor: Brand.framboise, backgroundColor: Brand.rose }]} testID="space-suspended">
                  <Text style={[styles.h2, ff.title, { fontSize: 22 }]}>{t.suspendedTitle}</Text>
                  <Text style={[styles.body, ff.text]}>{t.suspendedText}</Text>
                </View>
              ) : null}

              {/* Code personnel */}
              {code ? (
              <LinearGradient
                colors={[Brand.nuit, Brand.lavande]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.codeCard}
              >
                <View style={{ flex: 1, gap: 8, minWidth: 220 }}>
                  <Text style={[styles.codeLabel, ff.semi]}>{t.codeTitle}</Text>
                  <Text style={[styles.code, ff.bold]} selectable testID="space-code">
                    {code.code}
                  </Text>
                  <Text style={[styles.codeSub, ff.medium]}>
                    {t.discount(discountLabel(code, lang))}
                    {code.expiresAt ? ` · ${t.expires(formatDay(code.expiresAt, lang))}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: tablet ? 'flex-end' : 'flex-start', gap: 12 }}>
                  <View
                    style={[styles.status, { backgroundColor: code.isActive ? '#E7F6EF' : Brand.rose }]}
                    testID="space-status"
                  >
                    <Text style={[ff.bold, { fontSize: 13, color: code.isActive ? Brand.succes : Brand.framboise }]}>
                      {code.isActive ? t.codeActive : t.codePaused}
                    </Text>
                  </View>
                  {Platform.OS === 'web' && (
                    <Pressable
                      onPress={() => void copyText('code', code.code)}
                      accessibilityRole="button"
                      style={styles.copy}
                      testID="space-copy"
                    >
                      <Text style={[styles.copyText, ff.bold]}>{copied === 'code' ? t.copied : t.copy}</Text>
                    </Pressable>
                  )}
                </View>
              </LinearGradient>
              ) : null}

              {/* Lien suivi */}
              {data.shareLink ? (
                <View style={styles.card} testID="space-link">
                  <Text style={[styles.h2, ff.title, { fontSize: 22 }]}>{t.linkTitle}</Text>
                  <View style={styles.linkRow}>
                    <Text style={[styles.link, ff.semi]} selectable testID="space-link-value">
                      {data.shareLink}
                    </Text>
                    {Platform.OS === 'web' && (
                      <Pressable
                        onPress={() => void copyText('link', data.shareLink!)}
                        accessibilityRole="button"
                        style={styles.secondary}
                        testID="space-link-copy"
                      >
                        <Text style={[styles.secondaryText, ff.bold]}>{copied === 'link' ? t.copied : t.copy}</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={[styles.muted, ff.text]}>{t.linkHint}</Text>
                </View>
              ) : null}

              {/* Tunnel */}
              {data.funnel && code ? (
                <View style={styles.card} testID="space-funnel">
                  <Text style={[styles.h2, ff.title, { fontSize: 22 }]}>{t.funnelTitle}</Text>
                  <View style={{ flexDirection: tablet ? 'row' : 'column', gap: 12 }}>
                    <Step label={t.funnelVisits} value={data.funnel.visits} ff={ff} testID="space-funnel-visits" />
                    <Step
                      label={t.funnelSignups}
                      value={data.funnel.signups}
                      note={data.funnel.visits ? t.funnelRate(data.funnel.signupRate) : undefined}
                      ff={ff}
                      testID="space-funnel-signups"
                    />
                    <Step
                      label={t.funnelPurchases}
                      value={data.funnel.purchases}
                      note={data.funnel.signups ? t.funnelRate(data.funnel.purchaseRate) : undefined}
                      ff={ff}
                      testID="space-funnel-purchases"
                    />
                  </View>
                  {data.funnel.visits === 0 ? <Text style={[styles.muted, ff.text]}>{t.funnelEmpty}</Text> : null}
                  {data.funnel.freeActivations > 0 ? (
                    <Text style={[styles.muted, ff.text]}>{t.funnelFree(data.funnel.freeActivations)}</Text>
                  ) : null}
                </View>
              ) : null}

              {data.metrics ? (
                <View testID="space-metrics">
                  <View style={{ flexDirection: tablet ? 'row' : 'column', gap: 14 }}>
                    <Kpi label={t.kpiClicks} value={String(data.metrics.clicks)} ff={ff} testID="space-kpi-clicks" />
                    <Kpi
                      label={t.kpiConversions}
                      value={String(data.metrics.verifiedConversions)}
                      ff={ff}
                      testID="space-kpi-conversions"
                    />
                  </View>
                  <Text style={[styles.muted, ff.text, { marginTop: 8 }]}>{t.metricsNote}</Text>
                </View>
              ) : null}

              {code ? (
              <>
              {/* Chiffres clés */}
              <View style={{ flexDirection: tablet ? 'row' : 'column', gap: 14 }}>
                <Kpi label={t.kpiPurchases} value={String(data.totals.purchases)} ff={ff} testID="space-kpi-purchases" />
                <Kpi label={t.kpiRevenue} value={formatEuro(data.totals.revenue, lang)} ff={ff} testID="space-kpi-revenue" />
                {rate != null ? (
                  <Kpi
                    label={t.kpiCommission(rate)}
                    value={formatEuro(data.totals.commission, lang)}
                    ff={ff}
                    accent
                    testID="space-kpi-commission"
                  />
                ) : (
                  <Kpi label={t.kpiUses} value={String(code.uses)} ff={ff} testID="space-kpi-uses" />
                )}
              </View>
              {rate == null && <Text style={[styles.muted, ff.text]}>{t.noCommission}</Text>}
              {rate != null && <Text style={[styles.muted, ff.text]}>{t.frozenRate}</Text>}
              {(data.totals.refunded ?? 0) > 0 ? (
                <Text style={[styles.muted, ff.text]} testID="space-refunds">
                  {t.refundNote(
                    data.totals.refundedSales ?? 0,
                    formatEuro(data.totals.refunded ?? 0, lang),
                    formatEuro(data.totals.commissionReversed ?? 0, lang),
                  )}
                </Text>
              ) : null}


              {/* Historique */}
              <View style={styles.card} testID="space-history">
                <Text style={[styles.h2, ff.title]}>{t.historyTitle}</Text>
                {!hasSales ? (
                  <Text style={[styles.body, ff.text]}>{t.historyEmpty}</Text>
                ) : (
                  <View>
                    <View style={[styles.row, styles.rowHead]}>
                      <Text style={[styles.cellMonth, styles.head, ff.semi]}>{t.colMonth}</Text>
                      <Text style={[styles.cell, styles.head, ff.semi]}>{t.colPurchases}</Text>
                      <Text style={[styles.cell, styles.head, ff.semi]}>{t.colRevenue}</Text>
                      {rate != null && <Text style={[styles.cell, styles.head, ff.semi]}>{t.colCommission}</Text>}
                    </View>
                    {data.months.map((m) => {
                      const idle = m.purchases === 0 && !m.refunded;
                      return (
                      <View key={m.month} style={styles.row} testID={`space-month-${m.month}`}>
                        <Text style={[styles.cellMonth, ff.medium, idle && styles.zero]}>
                          {formatMonth(m.month, lang)}
                        </Text>
                        <Text style={[styles.cell, ff.text, idle && styles.zero]}>{m.purchases}</Text>
                        <Text style={[styles.cell, ff.text, idle && styles.zero]}>
                          {formatEuro(m.revenue, lang)}
                        </Text>
                        {rate != null && (
                          <Text style={[styles.cell, ff.semi, { color: idle ? Brand.encrePale : Brand.framboise }]}>
                            {formatEuro(m.commission, lang)}
                          </Text>
                        )}
                      </View>
                      );
                    })}
                  </View>
                )}
              </View>
              </>
              ) : null}

              {/* Offres de la marque */}
              {data.offers && data.offers.length > 0 ? (
                <View style={styles.card} testID="space-offers">
                  <Text style={[styles.h2, ff.title, { fontSize: 22 }]}>{t.offersTitle}</Text>
                  <Text style={[styles.muted, ff.text]}>{t.offersHint}</Text>
                  <Text style={[styles.muted, ff.semi, { color: Brand.lavande }]} testID="space-offers-note">
                    {t.offersClicksNote}
                  </Text>
                  {data.offers.map((o) => (
                    <View key={o.id} style={styles.offerRow} testID={`space-offer-${o.id}`}>
                      <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                        <Text style={[styles.body, ff.semi, { color: Brand.encre }]}>
                          {o.perk} · {o.title}
                        </Text>
                        <Text style={[styles.muted, ff.text]}>
                          {t.offerPlacement(o.placement)} ·{' '}
                          <Text testID={`space-offer-state-${o.id}`}>
                            {o.state ? t.offerState(o.state) : o.live ? t.offerLive : t.offerOff}
                          </Text>
                        </Text>
                      </View>
                      <Text style={[styles.offerStat, ff.text]}>
                        {t.offerImpressions} <Text style={ff.bold}>{o.impressions}</Text>
                      </Text>
                      <Text style={[styles.offerStat, ff.text]}>
                        {t.offerClicks} <Text style={ff.bold}>{o.clicks}</Text>
                      </Text>
                      <Text style={[styles.offerStat, ff.text]}>
                        {t.offerRate}{' '}
                        <Text style={ff.bold}>
                          {lang === 'fr' ? `${String(o.clickRate).replace('.', ',')} %` : `${o.clickRate}%`}
                        </Text>
                      </Text>
                      <Text style={[styles.offerStat, ff.text]} testID={`space-offer-sales-${o.id}`}>
                        {t.offerConfirmed} <Text style={[ff.bold, { color: Brand.framboise }]}>{o.confirmedSales ?? 0}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Kit prêt à publier */}
              {data.shareLink && code && !suspended ? (
                <View style={styles.card} testID="space-kit">
                  <Text style={[styles.h2, ff.title, { fontSize: 22 }]}>{t.kitTitle}</Text>
                  <Text style={[styles.muted, ff.text]}>{t.kitHint}</Text>
                  {t.kitPosts(data.shareLink, discountLabel(code, lang)).map((post, i) => (
                    <View key={i} style={styles.kitPost}>
                      <Text style={[styles.body, ff.text, { flex: 1 }]} selectable>
                        {post}
                      </Text>
                      {Platform.OS === 'web' && (
                        <Pressable
                          onPress={() => void copyText(`kit${i}`, post)}
                          accessibilityRole="button"
                          style={styles.secondary}
                          testID={`space-kit-copy-${i}`}
                        >
                          <Text style={[styles.secondaryText, ff.bold]}>{copied === `kit${i}` ? t.copied : t.copy}</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Règles */}
              <View style={styles.rules}>
                <Text style={[styles.h2, ff.title, { fontSize: 22 }]}>{t.rulesTitle}</Text>
                {t.rules.map((r) => (
                  <View key={r} style={styles.point}>
                    <Text style={[styles.pointMark, { color: Brand.lavande }]}>●</Text>
                    <Text style={[styles.body, ff.text, { flex: 1 }]}>{r}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.muted, ff.text]}>{t.privacy}</Text>
              <View style={styles.footerRow}>
                <Text style={[styles.muted, ff.text]}>{t.updated(formatDay(data.updatedAt, lang))}</Text>
                <Pressable onPress={() => void load()} accessibilityRole="button" style={styles.secondary} testID="space-refresh">
                  <Text style={[styles.secondaryText, ff.bold]}>{t.refresh}</Text>
                </Pressable>
              </View>
            </>
          )}

          <Text style={[styles.contact, ff.medium]}>{t.contact}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Kpi({
  label,
  value,
  ff,
  accent,
  testID,
}: {
  label: string;
  value: string;
  ff: ReturnType<typeof landingFonts>;
  accent?: boolean;
  testID: string;
}) {
  return (
    <View style={[styles.kpi, accent && { borderColor: Brand.framboise, backgroundColor: Brand.rose }]} testID={testID}>
      <Text style={[styles.kpiLabel, ff.semi]}>{label}</Text>
      <Text style={[styles.kpiValue, ff.title, accent && { color: Brand.framboise }]}>{value}</Text>
    </View>
  );
}

function Step({
  label,
  value,
  note,
  ff,
  testID,
}: {
  label: string;
  value: number;
  note?: string;
  ff: ReturnType<typeof landingFonts>;
  testID: string;
}) {
  return (
    <View style={[styles.kpi, { backgroundColor: Brand.fond }]} testID={testID}>
      <Text style={[styles.kpiLabel, ff.semi]}>{label}</Text>
      <Text style={[styles.kpiValue, ff.title]}>{value}</Text>
      {note ? <Text style={[styles.muted, ff.medium, { color: Brand.lavande }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Brand.fond },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 8 },
  langPill: { backgroundColor: Brand.blanc, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: Brand.bordRose },
  langText: { color: Brand.framboise, fontSize: 14 },
  kicker: { color: Brand.framboise, fontSize: 13, letterSpacing: 2 },
  h1: { color: Brand.encre },
  h2: { color: Brand.encre, fontSize: 26 },
  lead: { color: Brand.encreDouce, fontSize: 17, lineHeight: 27 },
  body: { color: Brand.encreDouce, fontSize: 15.5, lineHeight: 24 },
  muted: { color: Brand.encrePale, fontSize: 14, lineHeight: 21 },
  center: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  card: { backgroundColor: Brand.blanc, borderRadius: 24, padding: 22, gap: 14, borderWidth: 1, borderColor: Brand.bordRose },
  codeCard: { borderRadius: 26, padding: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' },
  codeLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 14 },
  code: { color: Brand.blanc, fontSize: 38, letterSpacing: 3 },
  codeSub: { color: 'rgba(255,255,255,0.86)', fontSize: 15 },
  status: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  copy: { backgroundColor: Brand.blanc, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11 },
  copyText: { color: Brand.nuit, fontSize: 15 },
  kpi: { flex: 1, backgroundColor: Brand.blanc, borderRadius: 20, padding: 18, gap: 6, borderWidth: 1, borderColor: Brand.bordLilas },
  kpiLabel: { color: Brand.encreDouce, fontSize: 14 },
  kpiValue: { color: Brand.encre, fontSize: 30 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Brand.bordRose, gap: 8 },
  rowHead: { paddingTop: 0 },
  head: { color: Brand.encrePale, fontSize: 13 },
  cellMonth: { flex: 1.6, color: Brand.encre, fontSize: 15 },
  cell: { flex: 1, textAlign: 'right', color: Brand.encre, fontSize: 15 },
  zero: { color: Brand.encrePale },
  rules: { backgroundColor: Brand.lilas, borderRadius: 24, padding: 22, gap: 10 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pointMark: { fontSize: 10, marginTop: 7 },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  secondary: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1.5, borderColor: Brand.lavande, paddingHorizontal: 18, paddingVertical: 9 },
  secondaryText: { color: Brand.lavande, fontSize: 14 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  link: { flexShrink: 1, color: Brand.nuit, fontSize: 16 },
  offerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Brand.bordRose },
  offerStat: { color: Brand.encreDouce, fontSize: 14 },
  kitPost: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', backgroundColor: Brand.fond, borderRadius: 16, padding: 14 },
  contact: { textAlign: 'center', color: Brand.encreDouce, fontSize: 14, marginTop: 8 },
});
