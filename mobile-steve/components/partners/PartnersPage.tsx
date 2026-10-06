import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '@/constants/brand';
import { useBrandFonts } from '@/services/brandFonts';
import api, { getReadableError } from '@/services/api';
import { landingFonts } from '@/components/landing/fonts';
import { Logo } from '@/components/landing/LandingPage';
import {
  CONTENT,
  PartnerForm,
  PartnerLang,
  PartnerType,
  initialPartnerLang,
  isPartnerFormValid,
  partnerPayload,
  registrationError,
} from './content';
import { REGISTRATION_TYPES } from './registration';

const TINTS: Record<PartnerType, [string, string]> = {
  ANNONCEUR: [Brand.rose, Brand.framboise],
  AMBASSADEUR: [Brand.lilas, Brand.lavande],
  CREATEUR: [Brand.ciel, Brand.nuit],
};

const EMPTY: PartnerForm = {
  type: null,
  name: '',
  email: '',
  company: '',
  country: '',
  city: '',
  website: '',
  audience: '',
  message: '',
  registrationType: null,
  registrationNumber: '',
  consent: false,
};

/** Page publique du Programme Partenaires (marques, ambassadeurs, créateurs). */
export function PartnersPage({ lang: forcedLang }: { lang?: PartnerLang }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready } = useBrandFonts();
  const ff = useMemo(() => landingFonts(ready), [ready]);
  const [lang, setLang] = useState<PartnerLang>(() => initialPartnerLang(forcedLang));
  const t = CONTENT[lang];
  const wide = width >= 1024;
  const tablet = width >= 720;
  const padX = wide ? 32 : 20;
  const container = { width: '100%' as const, maxWidth: 1180, alignSelf: 'center' as const, paddingHorizontal: padX };

  const [form, setForm] = useState<PartnerForm>(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(0);

  const set = <K extends keyof PartnerForm>(key: K, value: PartnerForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toForm = (type?: PartnerType) => {
    if (type) set('type', type);
    scrollRef.current?.scrollTo({ y: Math.max(0, formY.current - 12), animated: true });
  };
  const card = t.cards.find((c) => c.type === form.type);

  const submit = async () => {
    setError(null);
    if (!isPartnerFormValid(form)) {
      setError(registrationError(form, lang) ?? t.missing);
      return;
    }
    setSending(true);
    try {
      await api.post('/partners/apply', partnerPayload(form, lang));
      setSent(true);
      setForm(EMPTY);
    } catch (e) {
      setError(getReadableError(e));
    } finally {
      setSending(false);
    }
  };

  const h2 = [styles.h2, ff.title, { fontSize: wide ? 40 : 28, lineHeight: wide ? 46 : 33 }];

  return (
    <View style={styles.page} testID="partners-page">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* En-tête */}
        <LinearGradient colors={[Brand.rose, Brand.fond]} style={{ paddingBottom: wide ? 72 : 40 }}>
          <View style={[container, styles.header]}>
            <Pressable onPress={() => router.replace('/')} accessibilityRole="link" accessibilityLabel={t.back}>
              <Logo ff={ff} size={wide ? 26 : 22} />
            </Pressable>
            <Pressable
              onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              accessibilityRole="button"
              style={styles.langPill}
              testID="partners-lang"
            >
              <Text style={[styles.langText, ff.bold]}>{t.langSwitch}</Text>
            </Pressable>
          </View>
          <View style={[container, { gap: 18, paddingTop: wide ? 40 : 16 }]}>
            <Text style={[styles.kicker, ff.bold]}>{t.kicker.toUpperCase()}</Text>
            <Text style={[styles.h1, ff.title, { fontSize: wide ? 58 : 36, lineHeight: wide ? 64 : 42, maxWidth: 900 }]}>
              {t.title}{' '}
              <Text style={[ff.titleItalic, { color: Brand.framboise }]}>{t.titleAccent}</Text>
            </Text>
            <Text style={[styles.lead, ff.text, { maxWidth: 820 }]}>{t.intro}</Text>
            <Pressable onPress={() => toForm()} accessibilityRole="button" style={styles.ctaWrap} testID="partners-cta">
              <LinearGradient colors={[Brand.framboise, Brand.lavande]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                <Text style={[styles.ctaText, ff.bold]}>{t.cta}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Trois profils */}
        <View style={[container, { marginTop: wide ? 24 : 8, gap: 22 }]}>
          <Text style={h2}>{t.cardsTitle}</Text>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18 }}>
            {t.cards.map((c) => (
              <View key={c.type} style={[styles.card, wide && { flex: 1 }]} testID={`partners-card-${c.type}`}>
                <View style={[styles.cardBadge, { backgroundColor: TINTS[c.type][0] }]}>
                  <View style={[styles.cardDot, { backgroundColor: TINTS[c.type][1] }]} />
                </View>
                <Text style={[styles.cardTitle, ff.title]}>{c.title}</Text>
                <Text style={[styles.cardPitch, ff.semi]}>{c.pitch}</Text>
                <View style={{ gap: 8 }}>
                  {c.points.map((p) => (
                    <View key={p} style={styles.point}>
                      <Text style={[styles.pointMark, { color: TINTS[c.type][1] }]}>●</Text>
                      <Text style={[styles.pointText, ff.text]}>{p}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => toForm(c.type)} accessibilityRole="button" style={styles.cardLink}>
                  <Text style={[styles.cardLinkText, ff.bold, { color: TINTS[c.type][1] }]}>{t.cta} →</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Étapes et engagements */}
        <View style={[container, { marginTop: wide ? 72 : 44, flexDirection: wide ? 'row' : 'column', gap: wide ? 48 : 32 }]}>
          <View style={{ flex: 1, gap: 16 }}>
            <Text style={h2}>{t.stepsTitle}</Text>
            {t.steps.map((s, i) => (
              <View key={s.title} style={styles.step}>
                <Text style={[styles.stepNum, ff.title]}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, ff.bold]}>{s.title}</Text>
                  <Text style={[styles.stepText, ff.text]}>{s.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={{ flex: 1, gap: 16 }}>
            <Text style={h2}>{t.valuesTitle}</Text>
            {t.values.map((v) => (
              <View key={v.title} style={styles.value}>
                <Text style={[styles.stepTitle, ff.bold]}>{v.title}</Text>
                <Text style={[styles.stepText, ff.text]}>{v.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Formulaire */}
        <View
          style={[container, { marginTop: wide ? 72 : 44, maxWidth: 820 }]}
          onLayout={(e) => {
            formY.current = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.formCard}>
            {sent ? (
              <View style={{ gap: 12 }} testID="partners-success">
                <Text style={[styles.h2, ff.title, { fontSize: 26 }]}>{t.successTitle}</Text>
                <Text style={[styles.lead, ff.text]}>{t.successText}</Text>
                <Pressable onPress={() => setSent(false)} accessibilityRole="button">
                  <Text style={[styles.cardLinkText, ff.bold, { color: Brand.framboise }]}>{t.again}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <Text style={[styles.h2, ff.title, { fontSize: wide ? 34 : 26 }]}>{t.formTitle}</Text>
                <Text style={[styles.stepText, ff.text]}>{t.formIntro}</Text>

                <Text style={[styles.label, ff.semi]}>{t.fields.type}</Text>
                <View style={styles.chips}>
                  {t.cards.map((c) => {
                    const active = form.type === c.type;
                    return (
                      <Pressable
                        key={c.type}
                        onPress={() => set('type', c.type)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={[styles.chip, active && { backgroundColor: TINTS[c.type][1], borderColor: TINTS[c.type][1] }]}
                        testID={`partner-type-${c.type}`}
                      >
                        <Text style={[styles.chipText, ff.semi, active && { color: Brand.blanc }]}>{c.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ flexDirection: tablet ? 'row' : 'column', gap: 14 }}>
                  <Field label={t.fields.name} value={form.name} onChange={(v) => set('name', v)} ff={ff} testID="partner-name" flex={tablet} />
                  <Field label={t.fields.email} value={form.email} onChange={(v) => set('email', v)} ff={ff} testID="partner-email" flex={tablet} keyboard="email-address" />
                </View>
                <Field label={t.fields.company} value={form.company} onChange={(v) => set('company', v)} ff={ff} testID="partner-company" />
                <View style={{ flexDirection: tablet ? 'row' : 'column', gap: 14 }}>
                  <Field label={t.fields.country} value={form.country} onChange={(v) => set('country', v)} ff={ff} testID="partner-country" flex={tablet} />
                  <Field label={t.fields.city} value={form.city} onChange={(v) => set('city', v)} ff={ff} testID="partner-city" flex={tablet} />
                </View>
                <Field label={t.fields.website} value={form.website} onChange={(v) => set('website', v)} ff={ff} testID="partner-website" />
                {card && (
                  <Field
                    label={card.audienceLabel}
                    placeholder={card.audienceHint}
                    value={form.audience}
                    onChange={(v) => set('audience', v)}
                    ff={ff}
                    testID="partner-audience"
                  />
                )}
                <Field
                  label={t.fields.message}
                  placeholder={t.fields.messageHint}
                  value={form.message}
                  onChange={(v) => set('message', v)}
                  ff={ff}
                  testID="partner-message"
                  multiline
                />

                <View style={styles.regBox} testID="partner-registration">
                  <Text style={[styles.label, ff.semi]}>{t.registration.title}</Text>
                  <Text style={[styles.regIntro, ff.text]}>{t.registration.intro}</Text>
                  <View style={styles.chips}>
                    {REGISTRATION_TYPES.map((rt) => {
                      const active = form.registrationType === rt;
                      return (
                        <Pressable
                          key={rt}
                          onPress={() => set('registrationType', rt)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                          style={[styles.chip, active && { backgroundColor: Brand.nuit, borderColor: Brand.nuit }]}
                          testID={`partner-reg-${rt}`}
                        >
                          <Text style={[styles.chipText, ff.semi, active && { color: Brand.blanc }]}>
                            {t.registration.types[rt]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {form.registrationType && (
                    <Field
                      label={t.registration.numberLabel}
                      placeholder={t.registration.hints[form.registrationType]}
                      value={form.registrationNumber}
                      onChange={(v) => set('registrationNumber', v)}
                      ff={ff}
                      testID="partner-reg-number"
                    />
                  )}
                  <Text style={[styles.regHint, ff.text]}>{t.registration.noStatus}</Text>
                </View>

                <Pressable
                  onPress={() => set('consent', !form.consent)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: form.consent }}
                  style={styles.consent}
                  testID="partner-consent"
                >
                  <View style={[styles.box, form.consent && styles.boxOn]}>
                    {form.consent && <Text style={styles.boxTick}>✓</Text>}
                  </View>
                  <Text style={[styles.consentText, ff.text]}>
                    {t.consent}{' '}
                    <Text
                      style={[ff.semi, { color: Brand.framboise, textDecorationLine: 'underline' }]}
                      onPress={() => router.push('/legal/confidentialite' as never)}
                    >
                      {t.privacyLink}
                    </Text>
                  </Text>
                </Pressable>

                {error && (
                  <Text style={[styles.error, ff.semi]} accessibilityRole="alert" testID="partner-error">
                    {error}
                  </Text>
                )}

                <Pressable
                  onPress={submit}
                  disabled={sending}
                  accessibilityRole="button"
                  style={[styles.ctaWrap, { alignSelf: tablet ? 'flex-start' : 'stretch', opacity: sending ? 0.7 : 1 }]}
                  testID="partner-submit"
                >
                  <LinearGradient colors={[Brand.framboise, Brand.lavande]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                    {sending ? <ActivityIndicator color={Brand.blanc} /> : <Text style={[styles.ctaText, ff.bold]}>{t.submit}</Text>}
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
          <Text style={[styles.contact, ff.medium]}>{t.contact}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  ff,
  testID,
  placeholder,
  multiline,
  flex,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ff: ReturnType<typeof landingFonts>;
  testID: string;
  placeholder?: string;
  multiline?: boolean;
  flex?: boolean;
  keyboard?: 'email-address';
}) {
  return (
    <View style={[{ gap: 6 }, flex && { flex: 1 }]}>
      <Text style={[styles.label, ff.semi]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Brand.encrePale}
        multiline={multiline}
        keyboardType={keyboard}
        autoCapitalize={keyboard ? 'none' : 'sentences'}
        accessibilityLabel={label}
        style={[styles.input, ff.text, multiline && { minHeight: 120, textAlignVertical: 'top' }]}
        testID={testID}
      />
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
  h2: { color: Brand.encre },
  lead: { color: Brand.encreDouce, fontSize: 17, lineHeight: 27 },
  ctaWrap: { alignSelf: 'flex-start', borderRadius: 999, overflow: 'hidden' },
  cta: { paddingHorizontal: 26, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  ctaText: { color: Brand.blanc, fontSize: 16 },
  card: { backgroundColor: Brand.blanc, borderRadius: 24, padding: 24, gap: 12, borderWidth: 1, borderColor: Brand.bordRose },
  cardBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardDot: { width: 14, height: 14, borderRadius: 7 },
  cardTitle: { fontSize: 24, color: Brand.encre },
  cardPitch: { fontSize: 15.5, color: Brand.encreDouce, lineHeight: 23 },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pointMark: { fontSize: 10, marginTop: 6 },
  pointText: { flex: 1, fontSize: 15, color: Brand.encre, lineHeight: 22 },
  cardLink: { marginTop: 6 },
  cardLinkText: { fontSize: 15 },
  step: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', backgroundColor: Brand.blanc, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Brand.bordLilas },
  stepNum: { fontSize: 28, color: Brand.lavande, width: 26 },
  stepTitle: { fontSize: 16, color: Brand.encre },
  stepText: { fontSize: 15, color: Brand.encreDouce, lineHeight: 22 },
  value: { backgroundColor: Brand.lilas, borderRadius: 18, padding: 16, gap: 4 },
  formCard: { backgroundColor: Brand.blanc, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: Brand.bordRose },
  label: { fontSize: 14, color: Brand.encre },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1.5, borderColor: Brand.bordLilas, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Brand.fond },
  chipText: { fontSize: 14, color: Brand.encre },
  input: {
    borderWidth: 1.5,
    borderColor: Brand.bordLilas,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Brand.encre,
    backgroundColor: Brand.blanc,
  },
  regBox: { gap: 10, backgroundColor: Brand.fond, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Brand.bordLilas },
  regIntro: { fontSize: 14, color: Brand.encreDouce, lineHeight: 21 },
  regHint: { fontSize: 13, color: Brand.encrePale, lineHeight: 19 },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Brand.lavande, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxOn: { backgroundColor: Brand.lavande },
  boxTick: { color: Brand.blanc, fontSize: 14, fontWeight: '700' },
  consentText: { flex: 1, fontSize: 14, color: Brand.encreDouce, lineHeight: 21 },
  error: { color: Brand.danger, fontSize: 14 },
  contact: { textAlign: 'center', color: Brand.encreDouce, fontSize: 14, marginTop: 20 },
});
