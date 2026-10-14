import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  Globe,
  Users,
  Search,
  Check,
  Eye,
  EyeOff,
  Briefcase,
  Plus,
  X,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { PROFESSIONS_DATA, ALL_PROFESSIONS } from '@/constants/professions';
import { ProfessionIcon } from '@/components/BrandIcons';
import CityAutocomplete from '@/components/CityAutocomplete';
import legal from '@/constants/legal.json';
import { formatLegalDate } from '@/components/LegalDocument';

import { COUNTRIES, Country, detectUserCountry, getCountryByCode } from '@/constants/countries';
import {
  detectPlace,
  formatResidence,
  hasLocationPermission,
  LocationPermissionError,
  normName,
} from '@/services/location';

// ─── Écran principal ───────────────────────────────────────────────
import { useAuth } from '@/context/auth';
import { AuthService } from '@/services/auth';


const ERROR_COLOR = Brand.danger;
/** Nombre d'écrans de l'inscription (courts, un thème chacun). */
const STEP_COUNT = 6;

// ─── Date de naissance ────────────────────────────────────────────
const MIN_AGE = 18;
const MAX_AGE = 99;

/** Âge révolu à la date `today`. */
function getAge(date: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

/** Message d'erreur si la date de naissance est refusée, `null` sinon. */
function getBirthDateError(date: Date | null, today: Date = new Date()): string | null {
  if (!date) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > startOfToday.getTime()) {
    return 'La date de naissance ne peut pas être dans le futur.';
  }
  const age = getAge(date, today);
  if (age < MIN_AGE) return 'Vous devez avoir au moins 18 ans pour vous inscrire.';
  if (age > MAX_AGE) return 'Veuillez vérifier votre date de naissance : l’âge maximum accepté est de 99 ans.';
  return null;
}

/** Jour, mois, année saisis → date locale, ou message d'erreur. */
function parseBirthFields(day: string, month: string, year: string): { date: Date | null; error: string | null } {
  if (!day && !month && !year) return { date: null, error: 'Indiquez votre date de naissance.' };
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!day || !month || year.length !== 4) {
    return { date: null, error: 'Date incomplète : jour, mois et année (4 chiffres).' };
  }
  const date = new Date(y, m - 1, d);
  if (m < 1 || m > 12 || d < 1 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return { date: null, error: 'Cette date n’existe pas. Vérifiez le jour et le mois.' };
  }
  return { date, error: getBirthDateError(date) };
}

/** Date locale → « AAAA-MM-JJ » (toISOString décalerait la date d'un jour hors UTC). */
function toIsoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Texte de l'erreur renvoyée par l'API (chaîne ou liste de messages de validation). */
function serverMessageOf(error: any): string {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join('\n');
  return typeof message === 'string' ? message : '';
}

// ─── Brouillon d'inscription (sans mot de passe) ──────────────────
const DRAFT_KEY = 'boligo:signup-draft:v1';
const DRAFT_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

interface SignupDraft {
  savedAt: number;
  step: number;
  firstName: string;
  lastName: string;
  gender: 'H' | 'F' | null;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  profession: string;
  countryCode: string | null;
  city: string;
  meetingScope: string | null;
  email: string;
  phone: string;
  dialCountryCode: string | null;
}

// Clavier numérique et remplissage automatique adaptés à chaque plateforme.
const AUTOFILL = {
  bdayDay: Platform.OS === 'web' ? 'bday-day' : 'birthdate-day',
  bdayMonth: Platform.OS === 'web' ? 'bday-month' : 'birthdate-month',
  bdayYear: Platform.OS === 'web' ? 'bday-year' : 'birthdate-year',
} as const;

// ─── Options de préférences rencontre ─────────────────────────────
const MEETING_SCOPES = [
  {
    id: 'local',
    icon: MapPin,
    title: 'Local',
    subtitle: 'Même ville ou région',
    desc: 'Rencontrer des personnes près de chez vous, idéal pour se voir rapidement.',
  },
  {
    id: 'national',
    icon: Users,
    title: 'National',
    subtitle: 'Tout mon pays',
    desc: 'Ouvrir les rencontres à tout votre pays pour plus de compatibilité.',
  },
  {
    id: 'international',
    icon: Globe,
    title: 'International',
    subtitle: 'Partout dans le monde',
    desc: 'Sans frontières — rencontrer des âmes compatibles où qu\'elles soient.',
  },
];

// ─── Composant barre de progression ───────────────────────────────
function ProgressHeader({
  step,
  onBack,
}: {
  step: number;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navHeader, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Étape précédente"
      >
        <ChevronLeft size={26} color={Colors.text.primary100} />
      </TouchableOpacity>

      <View style={styles.progressRow}>
        {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((s) => (
          <View key={s} style={styles.progSegWrap}>
            {s <= step ? (
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progSegFilled}
              />
            ) : (
              <View style={styles.progSegEmpty} />
            )}
          </View>
        ))}
      </View>

      <View style={{ width: 34 }} />
    </View>
  );
}

/** Message d'erreur sous un champ. */
function FieldError({ message, testID, inside }: { message?: string | null; testID?: string; inside?: boolean }) {
  if (!message) return null;
  return (
    <Text style={[styles.fieldError, inside && styles.fieldErrorInside]} testID={testID} accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

type FieldName =
  | 'firstName' | 'gender' | 'birth' | 'profession' | 'country' | 'city' | 'scope'
  | 'email' | 'phone' | 'password' | 'confirm' | 'terms';

/** Champs vérifiés avant de quitter chaque étape. */
const STEP_FIELDS: Record<number, FieldName[]> = {
  1: ['firstName', 'gender'],
  2: ['birth', 'profession'],
  3: ['country', 'city'],
  4: ['scope'],
  5: ['email', 'phone', 'password', 'confirm'],
  6: ['terms'],
};

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const { signIn, token } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Étape 1 — Identité
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [gender, setGender]         = useState<'H' | 'F' | null>(null);

  // Étape 2 — Naissance et métier
  const [birthDay, setBirthDay]     = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear]   = useState('');
  const [profession, setProfession] = useState('');
  const [showProfessionModal, setShowProfessionModal] = useState(false);
  const [professionSearch, setProfessionSearch] = useState('');
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const filteredProfessions = ALL_PROFESSIONS.filter(p =>
    normName(p).includes(normName(professionSearch))
  );

  // Étape 3 — Localisation
  const [country, setCountry]       = useState<Country | null>(null);
  const [city, setCity]             = useState('');
  /** Liste des pays ouverte pour la résidence ou pour l'indicatif. */
  const [countryModal, setCountryModal] = useState<null | 'residence' | 'dial'>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);
  const autoLocated = useRef(false);

  // Étape 4 — Préférences
  const [meetingScope, setMeetingScope] = useState<string | null>(null);

  // Étape 5 — Compte & téléphone (indicatif du pays choisi, modifiable)
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone]                 = useState('');
  const [dialCountry, setDialCountry]     = useState<Country | null>(null);
  const [dialTouched, setDialTouched]     = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Étape 6 — Acceptation expresse des CGU : décochée par défaut, envoyée au serveur.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Erreurs : affichées sous le champ après sa sortie, ou après « Continuer ».
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [serverErrors, setServerErrors] = useState<{ email?: string; phone?: string; general?: string; emailExists?: boolean }>({});

  const touch = (f: FieldName) => setTouched((t) => (t[f] ? t : { ...t, [f]: true }));

  const phoneDialCode = (dialCountry ?? country)?.dialCode ?? '+33';
  const birth = parseBirthFields(birthDay, birthMonth, birthYear);
  const birthday = birth.error ? null : birth.date;

  // ─── Erreurs par champ ───────────────────────────────────────────
  const cleanPhone = phone.trim().replace(/[\s\-.()]/g, '');
  const fieldErrors: Record<FieldName, string | null> = {
    firstName: firstName.trim().length >= 2 ? null : 'Indiquez votre prénom (2 lettres au moins).',
    gender: gender ? null : 'Choisissez une réponse.',
    birth: birth.error,
    profession: profession.trim().length >= 2 ? null : 'Choisissez ou saisissez votre métier.',
    country: country ? null : 'Choisissez votre pays.',
    city: city.trim().length >= 2 ? null : 'Indiquez votre ville.',
    scope: meetingScope ? null : 'Choisissez où vous souhaitez rencontrer.',
    email: !email.trim()
      ? 'Indiquez votre adresse e-mail.'
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? serverErrors.email ?? null
        : 'Adresse e-mail invalide (exemple : nom@domaine.fr).',
    phone: !cleanPhone
      ? 'Indiquez votre numéro de téléphone.'
      : cleanPhone.length >= 8 && /^[0-9+]+$/.test(cleanPhone)
        ? serverErrors.phone ?? null
        : 'Numéro invalide : 8 chiffres au moins.',
    password: password.length >= 8 ? null : 'Mot de passe : 8 caractères au moins.',
    confirm: !confirmPassword
      ? 'Répétez votre mot de passe.'
      : confirmPassword === password ? null : 'Les deux mots de passe sont différents.',
    terms: termsAccepted ? null : 'Cochez la case pour accepter les CGU et la politique de confidentialité.',
  };
  /** Erreur affichée (champ quitté, ou étape déjà tentée). */
  const shown = (f: FieldName, s: number) => (touched[f] || attempted[s] ? fieldErrors[f] : null);
  const isStepValid = (s: number = step) => (STEP_FIELDS[s] ?? []).every((f) => !fieldErrors[f]);

  // ─── Brouillon : restauré à l'ouverture, enregistré à chaque changement ─
  const [draftReady, setDraftReady] = useState(false);

  // Compte déjà créé et validé (retour arrière du navigateur depuis le
  // Grand Entretien) : pas de retour à l'inscription ; « / » renvoie à
  // l'étape en cours. Les informations se modifient ensuite dans le profil.
  useEffect(() => {
    if (token) router.replace('/');
  }, [token, router]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let draft: SignupDraft | null = null;
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        draft = raw ? JSON.parse(raw) : null;
        if (draft && Date.now() - (draft.savedAt ?? 0) > DRAFT_MAX_AGE_MS) draft = null;
      } catch {
        draft = null;
      }
      if (!alive) return;
      if (draft) {
        setFirstName(draft.firstName ?? '');
        setLastName(draft.lastName ?? '');
        setGender(draft.gender ?? null);
        setBirthDay(draft.birthDay ?? '');
        setBirthMonth(draft.birthMonth ?? '');
        setBirthYear(draft.birthYear ?? '');
        setProfession(draft.profession ?? '');
        setCity(draft.city ?? '');
        setMeetingScope(draft.meetingScope ?? null);
        setEmail(draft.email ?? '');
        setPhone(draft.phone ?? '');
        const dc = draft.dialCountryCode ? getCountryByCode(draft.dialCountryCode) ?? null : null;
        if (dc) {
          setDialCountry(dc);
          setDialTouched(true);
        }
        // Le dernier écran (CGU) se revalide : reprise au plus à l’étape du compte.
        if (draft.step >= 1) setStep(Math.min(draft.step, STEP_COUNT - 1));
      }
      // Pays : celui du brouillon, sinon deviné d'après le fuseau horaire ; la
      // ville reste à choisir (une ville imposée fausserait le périmètre « Local »).
      const saved = draft?.countryCode ? getCountryByCode(draft.countryCode) ?? null : null;
      setCountry(saved ?? detectUserCountry());
      setDraftReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const draft: SignupDraft = {
      savedAt: Date.now(),
      step,
      firstName,
      lastName,
      gender,
      birthDay,
      birthMonth,
      birthYear,
      profession,
      countryCode: country?.code ?? null,
      city,
      meetingScope,
      email,
      phone,
      dialCountryCode: dialTouched ? dialCountry?.code ?? null : null,
    };
    const timer = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [draftReady, step, firstName, lastName, gender, birthDay, birthMonth, birthYear, profession,
    country, city, meetingScope, email, phone, dialCountry, dialTouched]);

  // Animations
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isFirstStepRender = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  const animateTransition = (nextStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    });
  };

  // L'entrée de l'étape est animée une fois la nouvelle vue montée : lancer
  // l'animation dans le callback ci-dessus, avant le rendu de l'étape, laissait
  // l'écran invisible (opacité 0) sur le web.
  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
    ]).start();
  }, [step, fadeAnim, slideAnim]);

  // Étape 3 : si la localisation a déjà été acceptée, la ville est préremplie
  // sans rien demander (toujours modifiable).
  useEffect(() => {
    if (step !== 3 || autoLocated.current || city.trim()) return;
    autoLocated.current = true;
    hasLocationPermission().then((granted) => {
      if (granted) handleGPS(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const chooseCountry = (c: Country) => {
    if (c.code !== country?.code) setCity('');
    setCountry(c);
    if (!dialTouched) setDialCountry(null);
  };

  const loginExisting = async (normalizedEmail: string) => {
    try {
      setIsSubmitting(true);
      const loginRes = await AuthService.login(normalizedEmail, password);

      // Si le compte n'est pas vérifié, redirection vers l'écran OTP
      if (loginRes.isVerified === false || (!loginRes.access_token && loginRes.email)) {
        router.push({
          pathname: '/(auth)/verify',
          params: { email: (loginRes.email || normalizedEmail).trim() },
        });
        return;
      }

      const lToken = loginRes?.access_token || loginRes?.token || loginRes?.accessToken;
      const lUserId = loginRes?.userId || loginRes?.user?.id || loginRes?.id || loginRes?._id;
      await signIn(lToken, lUserId, loginRes?.refresh_token || loginRes?.refreshToken);
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      router.replace('/interview/0');
    } catch {
      // Mot de passe différent : l'écran de connexion propose la réinitialisation.
      router.replace('/(auth)/login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = async () => {
    if (!birthday) return;
    // L'adresse e-mail est normalisée avant envoi (le serveur l'enregistre en minuscules).
    const normalizedEmail = email.trim().toLowerCase();
    setServerErrors({});
    setIsSubmitting(true);
    try {
      const formattedPhone = cleanPhone.startsWith('+') ? phone.trim() : `${phoneDialCode} ${phone.trim()}`;

      const result = await AuthService.register({
        email: normalizedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: toIsoDay(birthday),
        gender: gender!,
        // « Ville, Pays » : format lu par le serveur (région, langues, filtres).
        city: formatResidence(city, country),
        telephone: formattedPhone,
        job: profession.trim(),
        meetingScope: (meetingScope as 'local' | 'national' | 'international' | null) ?? undefined,
        acceptTerms: true,
        termsVersion: legal.version,
      });

      // Vérifier si le token est fourni ou si une vérification OTP est requise
      const accessToken = result?.access_token || result?.token || result?.accessToken;
      const userId = result?.userId || result?.user?.id || result?.id || result?.user?._id || result?._id;
      const refreshToken = result?.refresh_token || result?.refreshToken;
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});

      if (accessToken) {
        await signIn(accessToken, userId, refreshToken);
        router.replace('/interview/0');
      } else {
        // Le compte a été créé mais nécessite obligatoirement la validation du code OTP
        router.push({
          pathname: '/(auth)/verify',
          params: { email: normalizedEmail },
        });
      }
    } catch (error: any) {
      console.error('Registration failed:', error?.response?.status ?? error?.message);
      const serverMsg = serverMessageOf(error);

      if (error?.response?.status === 409) {
        // Le serveur distingue le doublon de téléphone du doublon d'e-mail :
        // retour à l'écran du compte, erreur sous le champ concerné.
        if (/t[ée]l[ée]phone|phone/i.test(serverMsg)) {
          setServerErrors({ phone: 'Ce numéro est déjà utilisé. Vérifiez-le, ou connectez-vous si ce compte est le vôtre.' });
        } else {
          setServerErrors({ email: 'Un compte existe déjà avec cet e-mail.', emailExists: true });
        }
        setAttempted((a) => ({ ...a, 5: true }));
        animateTransition(5);
      } else {
        setServerErrors({
          // readableMessage (posé par l'intercepteur) couvre réseau, 429 et 5xx en français.
          general: error?.readableMessage || serverMsg || 'Une erreur est survenue lors de l’inscription. Veuillez réessayer.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!isStepValid()) {
      setAttempted((a) => ({ ...a, [step]: true }));
      return;
    }
    if (step < STEP_COUNT) animateTransition(step + 1);
    else submit();
  };

  const handleBack = () => {
    if (step > 1) animateTransition(step - 1);
    else {
      router.replace('/');
    }
  };

  // GPS : commune exacte, dans un champ modifiable.
  const handleGPS = async (silent = false) => {
    setGpsLoading(true);
    setGpsMessage(null);
    try {
      const place = await detectPlace();
      if (place.country) {
        chooseCountry(place.country);
      }
      if (place.city) setCity(place.city);
      if (!place.country) {
        setGpsMessage({
          tone: 'error',
          text: 'Votre pays ne figure pas encore dans la liste : choisissez le plus proche et saisissez votre ville.',
        });
      } else if (!place.city) {
        setGpsMessage({ tone: 'info', text: 'Pays détecté. Saisissez votre ville ci-dessous.' });
      } else if (place.accuracy && place.accuracy > 2000) {
        setGpsMessage({
          tone: 'info',
          text: `Position approximative (à ${Math.round(place.accuracy / 1000)} km près) : vérifiez la ville et corrigez-la si besoin.`,
        });
      } else {
        setGpsMessage({ tone: 'info', text: 'Ville détectée : vous pouvez la corriger ci-dessous.' });
      }
    } catch (e) {
      if (!silent) {
        setGpsMessage({
          tone: 'error',
          text: e instanceof LocationPermissionError
            ? 'Localisation refusée : saisissez votre ville ci-dessous (ou activez la localisation dans les réglages).'
            : 'Position introuvable : saisissez votre ville ci-dessous.',
        });
      }
    }
    setGpsLoading(false);
  };

  const filteredCountries = COUNTRIES.filter(c =>
    normName(c.name).includes(normName(countrySearch)) || c.dialCode.includes(countrySearch.trim())
  );
  const closeCountryModal = () => {
    setCountryModal(null);
    setCountrySearch('');
  };

  const openLegal = (path: '/legal/cgu' | '/legal/confidentialite') => (e?: { stopPropagation?: () => void }) => {
    // Sur le web, le clic remonterait jusqu'à la case et la (dé)cocherait.
    e?.stopPropagation?.();
    router.push(path as any);
  };

  const stepAnimStyle = { opacity: fadeAnim, transform: [{ translateY: slideAnim }] };
  const stepHeader = (title: string, desc?: string) => (
    <>
      <Text style={styles.stepLabel}>Étape {step} sur {STEP_COUNT}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      {desc ? <Text style={styles.stepDesc}>{desc}</Text> : null}
    </>
  );

  // ─── Étape 1 — Identité ──────────────────────────────────────────
  const renderStep1 = () => (
    <Animated.View style={[styles.stepWrap, stepAnimStyle]}>
      {stepHeader('Commençons par\nvous connaître.', "Seuls votre prénom, votre âge, votre ville et votre métier apparaissent sur votre fiche ; votre nom reste privé.")}

      <View style={[styles.inputGroup, shown('firstName', 1) && styles.inputGroupError]}>
        <Text style={styles.inputLabel} nativeID="first-name-label">Prénom *</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Prénom (obligatoire)"
          accessibilityLabelledBy="first-name-label"
          value={firstName}
          onChangeText={setFirstName}
          onBlur={() => touch('firstName')}
          placeholder="Votre prénom"
          placeholderTextColor={Colors.text.primary40}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          testID="first-name"
        />
      </View>
      <FieldError message={shown('firstName', 1)} testID="first-name-error" />

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel} nativeID="last-name-label">Nom (privé)</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Nom (privé, n'apparaît pas sur votre fiche)"
          accessibilityLabelledBy="last-name-label"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Votre nom"
          placeholderTextColor={Colors.text.primary40}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          autoCorrect={false}
          testID="last-name"
        />
      </View>

      <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
        <Text style={styles.inputLabel} nativeID="gender-label">Je suis *</Text>
        <View style={styles.genderRow} accessibilityRole="radiogroup" accessibilityLabelledBy="gender-label">
          {([['H', 'Homme'], ['F', 'Femme']] as const).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => { setGender(value); touch('gender'); }}
              style={[styles.genderBtn, gender === value && styles.genderBtnActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: gender === value }}
            >
              <Text style={[styles.genderText, gender === value && styles.genderTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FieldError message={shown('gender', 1)} testID="gender-error" inside />
      </View>
    </Animated.View>
  );

  // ─── Étape 2 — Naissance et métier ───────────────────────────────
  const onBirthPart = (part: 'day' | 'month' | 'year', text: string) => {
    const digits = text.replace(/\D/g, '');
    // Date collée d'un bloc (« 15/03/1990 ») : répartie dans les trois cases.
    if (part === 'day' && digits.length >= 8) {
      setBirthDay(digits.slice(0, 2));
      setBirthMonth(digits.slice(2, 4));
      setBirthYear(digits.slice(4, 8));
      return;
    }
    if (part === 'day') {
      setBirthDay(digits.slice(0, 2));
      if (digits.length === 2) monthRef.current?.focus();
    } else if (part === 'month') {
      setBirthMonth(digits.slice(0, 2));
      if (digits.length === 2) yearRef.current?.focus();
    } else {
      setBirthYear(digits.slice(0, 4));
      if (digits.length === 4) touch('birth');
    }
  };

  const renderStep2 = () => {
    const birthErr = shown('birth', 2);
    return (
      <Animated.View style={[styles.stepWrap, stepAnimStyle]}>
        {stepHeader('Votre âge\net votre métier.', "Vous devez avoir au moins 18 ans.")}

        <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
          <Text style={styles.inputLabel} nativeID="birth-label">Date de naissance *</Text>
          <View style={styles.birthRow}>
            <View style={styles.birthCell}>
              <TextInput
                style={[styles.birthInput, birthErr && styles.birthInputError]}
                value={birthDay}
                onChangeText={(t) => onBirthPart('day', t)}
                placeholder="JJ"
                placeholderTextColor={Colors.text.primary40}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={Platform.OS === 'web' ? 10 : 2}
                autoComplete={AUTOFILL.bdayDay as any}
                accessibilityLabel="Jour de naissance"
                testID="birth-day"
              />
              <Text style={styles.birthHint}>Jour</Text>
            </View>
            <Text style={styles.birthSep}>/</Text>
            <View style={styles.birthCell}>
              <TextInput
                ref={monthRef}
                style={[styles.birthInput, birthErr && styles.birthInputError]}
                value={birthMonth}
                onChangeText={(t) => onBirthPart('month', t)}
                placeholder="MM"
                placeholderTextColor={Colors.text.primary40}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={2}
                autoComplete={AUTOFILL.bdayMonth as any}
                accessibilityLabel="Mois de naissance"
                testID="birth-month"
              />
              <Text style={styles.birthHint}>Mois</Text>
            </View>
            <Text style={styles.birthSep}>/</Text>
            <View style={[styles.birthCell, styles.birthCellYear]}>
              <TextInput
                ref={yearRef}
                style={[styles.birthInput, birthErr && styles.birthInputError]}
                value={birthYear}
                onChangeText={(t) => onBirthPart('year', t)}
                onBlur={() => touch('birth')}
                placeholder="AAAA"
                placeholderTextColor={Colors.text.primary40}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={4}
                autoComplete={AUTOFILL.bdayYear as any}
                accessibilityLabel="Année de naissance"
                testID="birth-year"
              />
              <Text style={styles.birthHint}>Année</Text>
            </View>
          </View>
          {birthday && !birthErr ? (
            <Text style={styles.fieldOk} testID="birth-age">{getAge(birthday)} ans</Text>
          ) : null}
          <FieldError message={birthErr} testID="birthdate-error" inside />
        </View>

        <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
          <Text style={styles.inputLabel}>Profession / Métier *</Text>
          <TouchableOpacity
            style={[styles.selectBtn, shown('profession', 2) && styles.selectBtnError]}
            onPress={() => setShowProfessionModal(true)}
            activeOpacity={0.75}
            testID="profession-select"
          >
            <View style={styles.selectBtnLeft}>
              <View style={[styles.selectIconWrap, profession ? styles.selectIconWrapActive : null]}>
                <Briefcase size={17} color={profession ? Colors.primary.red : Colors.text.primary40} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.selectBtnTitle, !profession && styles.selectBtnPlaceholder]}>
                  {profession || 'Sélectionner ou rechercher un métier'}
                </Text>
                {profession ? (
                  <Text style={styles.selectBtnSub}>Appuyez pour modifier</Text>
                ) : null}
              </View>
            </View>
            <ChevronRight size={18} color={Colors.text.primary40} />
          </TouchableOpacity>
          <FieldError message={shown('profession', 2)} testID="profession-error" inside />
        </View>
      </Animated.View>
    );
  };

  // ─── Étape 3 — Localisation ──────────────────────────────────────
  const renderStep3 = () => (
    <Animated.View style={[styles.stepWrap, stepAnimStyle]}>
      {stepHeader('Où vivez-vous ?', "Pour vous proposer des personnes près de chez vous ou ailleurs.")}

      <TouchableOpacity
        style={styles.gpsBtn}
        onPress={() => handleGPS(false)}
        activeOpacity={0.8}
        disabled={gpsLoading}
        testID="gps-button"
      >
        <LinearGradient
          colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gpsBtnGradient}
        >
          {gpsLoading ? <ActivityIndicator size="small" color="#fff" /> : <Navigation size={18} color="#fff" />}
          <Text style={styles.gpsBtnText}>
            {gpsLoading ? 'Détection en cours…' : 'Utiliser ma position'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      {gpsMessage ? (
        <Text
          style={[styles.gpsMessage, gpsMessage.tone === 'error' && { color: ERROR_COLOR }]}
          testID="gps-message"
        >
          {gpsMessage.text}
        </Text>
      ) : null}

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>ou saisir</Text>
        <View style={styles.orLine} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Pays *</Text>
        <TouchableOpacity
          style={styles.selectorBtn}
          onPress={() => setCountryModal('residence')}
          activeOpacity={0.7}
          testID="country-select"
        >
          <Text style={[styles.selectorText, !country && styles.selectorPlaceholder]} numberOfLines={1}>
            {country ? `${country.flag}  ${country.name}` : 'Sélectionner un pays'}
          </Text>
          <ChevronRight size={18} color={Colors.text.primary40} />
        </TouchableOpacity>
        <FieldError message={shown('country', 3)} inside />
      </View>

      <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
        <Text style={styles.inputLabel}>Ville *</Text>
        <CityAutocomplete
          value={city}
          onChangeText={setCity}
          onSelect={(s) => {
            if (s.country && s.country.code !== country?.code) chooseCountry(s.country);
            setCity(s.name);
            touch('city');
          }}
          onBlur={() => touch('city')}
          countryCode={country?.code}
          placeholder="Tapez votre ville (ex. Bezons)"
          error={shown('city', 3)}
          testID="city-search"
          inputStyle={styles.cityInput}
        />
        <Text style={styles.fieldHelp}>Votre ville n’apparaît pas ? Écrivez-la simplement.</Text>
      </View>

      {country && city.trim().length >= 2 ? (
        <View style={styles.locationRecap}>
          <LinearGradient
            colors={[Colors.primary.red + '12', Colors.primary.purple + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.locationRecapGrad}
          >
            <MapPin size={16} color={Colors.primary.red} />
            <Text style={styles.locationRecapText}>
              {formatResidence(city, country)} {country.flag}
            </Text>
          </LinearGradient>
        </View>
      ) : null}
    </Animated.View>
  );

  // ─── Étape 4 — Préférences rencontre ─────────────────────────────
  const renderStep4 = () => (
    <Animated.View style={[styles.stepWrap, stepAnimStyle]}>
      {stepHeader('Où souhaitez-vous\nrencontrer ?', "Vous pourrez la modifier à tout moment depuis « Modifier le profil ».")}

      <View style={styles.scopeList}>
        {MEETING_SCOPES.map((scope) => {
          const Icon = scope.icon;
          const selected = meetingScope === scope.id;
          return (
            <TouchableOpacity
              key={scope.id}
              style={[styles.scopeCard, selected && styles.scopeCardActive]}
              onPress={() => setMeetingScope(scope.id)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              {selected && (
                <LinearGradient
                  colors={[Colors.primary.red + '10', Colors.primary.purple + '08', Colors.primary.orange + '06']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}

              <View style={styles.scopeCardLeft}>
                <View style={[styles.scopeIconWrap, selected && styles.scopeIconActive]}>
                  {selected ? (
                    <LinearGradient
                      colors={[Colors.primary.red, Colors.primary.purple]}
                      style={styles.scopeIconGrad}
                    >
                      <Icon size={20} color="#fff" />
                    </LinearGradient>
                  ) : (
                    <Icon size={20} color={Colors.text.primary40} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.scopeTitle, selected && styles.scopeTitleActive]}>
                    {scope.title}
                  </Text>
                  <Text style={styles.scopeSubtitle}>{scope.subtitle}</Text>
                  <Text style={styles.scopeDesc}>{scope.desc}</Text>
                </View>
              </View>

              {selected && (
                <View style={styles.scopeCheck}>
                  <LinearGradient
                    colors={[Colors.primary.red, Colors.primary.purple]}
                    style={styles.scopeCheckGrad}
                  >
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </LinearGradient>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <FieldError message={shown('scope', 4)} inside />
    </Animated.View>
  );

  // ─── Étape 5 — Compte ────────────────────────────────────────────
  const dialFlag = (dialCountry ?? country)?.flag || '🌍';
  const phonePlaceholder = (dialCountry ?? country)?.placeholder || '06 12 34 56 78';
  const renderStep5 = () => (
    <Animated.View style={[styles.stepWrap, stepAnimStyle]}>
      {stepHeader('Créez votre\ncompte sécurisé.', "Votre e-mail et votre téléphone ne sont révélés qu'avec votre accord. Vos données ne sont jamais vendues.")}

      <View style={[styles.inputGroup, shown('email', 5) && styles.inputGroupError]}>
        <Text style={styles.inputLabel}>Adresse e-mail *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (serverErrors.email) setServerErrors((e) => ({ ...e, email: undefined, emailExists: false }));
          }}
          onBlur={() => touch('email')}
          placeholder="exemple@email.com"
          placeholderTextColor={Colors.text.primary40}
          keyboardType="email-address"
          inputMode="email"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          testID="email"
        />
      </View>
      <FieldError message={shown('email', 5)} testID="email-error" />
      {serverErrors.emailExists ? (
        <TouchableOpacity
          onPress={() => loginExisting(email.trim().toLowerCase())}
          style={styles.inlineAction}
          testID="email-login"
        >
          <Text style={styles.inlineActionText}>Se connecter avec cet e-mail</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.inputGroup, shown('phone', 5) && styles.inputGroupError]}>
        <Text style={styles.inputLabel}>Numéro de téléphone *</Text>
        <View style={styles.phoneInputRow}>
          <TouchableOpacity
            style={styles.dialCodeBtn}
            onPress={() => setCountryModal('dial')}
            activeOpacity={0.7}
            accessibilityLabel={`Indicatif ${phoneDialCode}, modifier`}
            testID="dial-code"
          >
            <Text style={styles.dialCodeFlag}>{dialFlag}</Text>
            <Text style={styles.dialCodeText}>{phoneDialCode}</Text>
            <ChevronRight size={14} color={Colors.text.primary40} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (serverErrors.phone) setServerErrors((e) => ({ ...e, phone: undefined }));
            }}
            onBlur={() => touch('phone')}
            placeholder={phonePlaceholder}
            placeholderTextColor={Colors.text.primary40}
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel-national"
            textContentType="telephoneNumber"
            testID="phone"
          />
        </View>
      </View>
      <FieldError message={shown('phone', 5)} testID="phone-error" />

      <View style={[styles.inputGroup, shown('password', 5) && styles.inputGroupError]}>
        <Text style={styles.inputLabel}>Mot de passe *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, minWidth: 0 }]}
            value={password}
            onChangeText={setPassword}
            onBlur={() => touch('password')}
            placeholder="Minimum 8 caractères"
            placeholderTextColor={Colors.text.primary40}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            autoCapitalize="none"
            autoCorrect={false}
            testID="password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            style={styles.eyeBtn}
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword
              ? <EyeOff size={20} color={Colors.text.primary40} />
              : <Eye size={20} color={Colors.text.primary40} />
            }
          </TouchableOpacity>
        </View>
      </View>
      <FieldError message={shown('password', 5)} testID="password-error" />

      <View style={[styles.inputGroup, shown('confirm', 5) && styles.inputGroupError]}>
        <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, minWidth: 0 }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => touch('confirm')}
            placeholder="Répétez votre mot de passe"
            placeholderTextColor={Colors.text.primary40}
            secureTextEntry={!showConfirmPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            autoCapitalize="none"
            autoCorrect={false}
            testID="password-confirm"
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(v => !v)}
            style={styles.eyeBtn}
            accessibilityLabel={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showConfirmPassword
              ? <EyeOff size={20} color={Colors.text.primary40} />
              : <Eye size={20} color={Colors.text.primary40} />
            }
          </TouchableOpacity>
        </View>
      </View>
      <FieldError message={shown('confirm', 5)} testID="confirm-error" />
    </Animated.View>
  );

  // ─── Étape 6 — Récapitulatif et CGU ──────────────────────────────
  const recapRow = (label: string, value: string, goTo: number) => (
    <TouchableOpacity key={label} style={styles.recapRow} onPress={() => animateTransition(goTo)} activeOpacity={0.7}>
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapVal} numberOfLines={2}>{value}</Text>
    </TouchableOpacity>
  );
  const renderStep6 = () => (
    <Animated.View style={[styles.stepWrap, stepAnimStyle]}>
      {stepHeader('Tout est prêt.', "Vérifiez vos informations : touchez une ligne pour la modifier.")}

      <View style={styles.recap}>
        <Text style={styles.recapTitle}>Récapitulatif</Text>
        {recapRow('Nom', `${firstName.trim()} ${lastName.trim()}`.trim(), 1)}
        {birthday ? recapRow('Âge', `${getAge(birthday)} ans`, 2) : null}
        {profession ? recapRow('Profession', profession, 2) : null}
        {country && city.trim() ? recapRow('Ville', `${formatResidence(city, country)} ${country.flag}`, 3) : null}
        {meetingScope ? recapRow('Rencontres', MEETING_SCOPES.find(s => s.id === meetingScope)?.title ?? '', 4) : null}
        {recapRow('E-mail', email.trim(), 5)}
        {recapRow('Téléphone', `${phoneDialCode} ${phone.trim()}`, 5)}
      </View>

      {/* Acceptation expresse des CGU (décochée par défaut, envoyée au serveur) */}
      <TouchableOpacity
        style={[styles.termsBox, termsAccepted && styles.termsBoxActive, shown('terms', 6) && styles.termsBoxError]}
        onPress={() => setTermsAccepted(v => !v)}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
        testID="terms-checkbox"
      >
        <View style={[styles.termsCheck, termsAccepted && styles.termsCheckActive]}>
          {termsAccepted && <Check size={14} color="#FFF" strokeWidth={3} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.termsText}>
            J'accepte les{' '}
            <Text style={styles.termsLink} onPress={openLegal('/legal/cgu')} testID="terms-cgu-link">
              CGU
            </Text>
            {' '}et la{' '}
            <Text style={styles.termsLink} onPress={openLegal('/legal/confidentialite')} testID="terms-privacy-link">
              politique de confidentialité
            </Text>
            , y compris le traitement de mes réponses à l'entretien pour calculer ma compatibilité.
          </Text>
          <Text style={styles.termsVersion}>Version du {formatLegalDate(legal.version)}</Text>
        </View>
      </TouchableOpacity>
      <FieldError message={shown('terms', 6)} testID="terms-error" inside />
      {serverErrors.general ? (
        <Text style={[styles.fieldError, styles.generalError]} testID="register-error">{serverErrors.general}</Text>
      ) : null}
    </Animated.View>
  );

  const valid = isStepValid();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />

      <ProgressHeader
        step={step}
        onBack={handleBack}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
      </ScrollView>

      {/* Footer bouton : toujours actif ; s'il manque quelque chose, les erreurs s'affichent sous les champs. */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={styles.btnWrap}
          disabled={isSubmitting}
          accessibilityRole="button"
          testID="next-button"
        >
          <LinearGradient
            colors={valid
              ? [Colors.primary.red, Colors.primary.purple, Colors.primary.orange]
              : ['#E4DCEA', '#E4DCEA', '#E4DCEA']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <ActivityIndicator color={Colors.neutral.white} />
                <Text style={[styles.btnText, { color: Colors.neutral.white, opacity: 0.9 }]}>
                  Création...
                </Text>
              </View>
            ) : (
              <Text style={[styles.btnText, !valid && { color: Colors.text.primary70 }]}>
                {step === STEP_COUNT ? 'Créer mon compte' : 'Continuer'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {step === STEP_COUNT && !termsAccepted && (
          <Text style={styles.termsHint} testID="terms-hint">
            Cochez la case d'acceptation des CGU pour créer votre compte.
          </Text>
        )}

        {step === 1 && (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
            style={{ marginTop: 14, alignItems: 'center', justifyContent: 'center', minHeight: 44 }}
            accessibilityRole="link"
            testID="signup-login-link"
          >
            <Text style={{ fontSize: 13, color: Colors.primary.red, fontFamily: Typography.fontFamily.medium }}>
              Vous avez déjà un compte ? <Text style={{ textDecorationLine: 'underline', fontFamily: Typography.fontFamily.bold }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Modal Métier / Profession ────────────────────────────── */}
      <Modal visible={showProfessionModal} transparent animationType="slide" onRequestClose={() => setShowProfessionModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowProfessionModal(false)} />
          <View style={[styles.calendarSheet, { maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choisir votre profession</Text>
            <Text style={styles.sheetSubtitle}>Sélectionnez dans la liste ou tapez votre métier</Text>

            {/* Barre de recherche */}
            <View style={styles.searchBar}>
              <Search size={18} color={Colors.text.primary40} />
              <TextInput
                style={styles.searchInput}
                value={professionSearch}
                onChangeText={setProfessionSearch}
                placeholder="Rechercher (ex: Développeur, Médecin...)"
                placeholderTextColor={Colors.text.primary40}
                autoComplete="organization-title"
                autoFocus
              />
              {professionSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProfessionSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={Colors.text.primary40} />
                </TouchableOpacity>
              )}
            </View>

            {/* Option directe d'ajout personnalisé */}
            {professionSearch.trim().length > 0 && !filteredProfessions.includes(professionSearch.trim()) && (
              <TouchableOpacity
                style={styles.customProfessionOption}
                onPress={() => {
                  setProfession(professionSearch.trim());
                  setProfessionSearch('');
                  setShowProfessionModal(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.customPlusIcon}>
                  <Plus size={16} color="#FFF" />
                </View>
                <Text style={styles.customProfessionText}>
                  Utiliser <Text style={{ fontFamily: Typography.fontFamily.bold, color: Colors.primary.red }}>« {professionSearch.trim()} »</Text>
                </Text>
              </TouchableOpacity>
            )}

            <ScrollView style={styles.professionList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {professionSearch.trim().length > 0 ? (
                // Liste filtrée par la recherche
                <View style={{ paddingBottom: 24 }}>
                  {filteredProfessions.map((item) => {
                    const isSelected = profession === item;
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.professionItem, isSelected && styles.professionItemActive]}
                        onPress={() => {
                          setProfession(item);
                          setProfessionSearch('');
                          setShowProfessionModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.professionItemText, isSelected && styles.professionItemTextActive]}>
                          {item}
                        </Text>
                        {isSelected && <Check size={18} color={Colors.primary.red} strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })}
                  {filteredProfessions.length === 0 && (
                    <View style={styles.emptyProfessionWrap}>
                      <Text style={styles.emptyProfessionText}>Ce métier n'est pas dans la liste standard.</Text>
                      <TouchableOpacity
                        style={styles.emptyProfessionBtn}
                        onPress={() => {
                          setProfession(professionSearch.trim());
                          setProfessionSearch('');
                          setShowProfessionModal(false);
                        }}
                      >
                        <Text style={styles.emptyProfessionBtnText}>
                          Valider « {professionSearch.trim()} »
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                // Liste par catégories avec icônes
                <View style={{ paddingBottom: 24 }}>
                  {PROFESSIONS_DATA.map((category) => (
                    <View key={category.category} style={styles.professionCategoryGroup}>
                      <View style={styles.professionCategoryHeader}>
                        <ProfessionIcon category={category.category} />
                        <Text style={styles.professionCategoryTitle}>{category.category}</Text>
                      </View>
                      {category.items.map((item) => {
                        const isSelected = profession === item;
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[styles.professionItem, isSelected && styles.professionItemActive]}
                            onPress={() => {
                              setProfession(item);
                              setShowProfessionModal(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.professionItemText, isSelected && styles.professionItemTextActive]}>
                              {item}
                            </Text>
                            {isSelected && <Check size={18} color={Colors.primary.red} strokeWidth={2.5} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowProfessionModal(false)} style={styles.cancelBtn} testID="profession-cancel">
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal Pays (résidence ou indicatif téléphonique) ─────── */}
      <Modal visible={countryModal !== null} transparent animationType="slide" onRequestClose={closeCountryModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeCountryModal} />
          <View style={[styles.calendarSheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {countryModal === 'dial' ? 'Indicatif téléphonique' : 'Choisir un pays'}
            </Text>

            <View style={styles.searchBar}>
              <Search size={16} color={Colors.text.primary40} />
              <TextInput
                style={styles.searchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Rechercher..."
                placeholderTextColor={Colors.text.primary40}
                autoComplete="off"
                autoFocus
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={c => c.code}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = countryModal === 'dial'
                  ? (dialCountry ?? country)?.code === item.code
                  : country?.code === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.countryItem, active && styles.countryItemActive]}
                    onPress={() => {
                      if (countryModal === 'dial') {
                        setDialCountry(item);
                        setDialTouched(true);
                      } else {
                        chooseCountry(item);
                      }
                      closeCountryModal();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <Text style={[styles.countryName, active && styles.countryNameActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.countryDialCodeBadge}>{item.dialCode}</Text>
                    {active && (
                      <Check size={16} color={Colors.primary.red} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={closeCountryModal} style={styles.cancelBtn} testID="country-cancel">
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },

  // Header navigation
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  progressRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
    marginHorizontal: Spacing.lg,
  },
  progSegWrap: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progSegFilled: { flex: 1, height: 4, borderRadius: 2 },
  progSegEmpty: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral.border,
  },
  skipBtn: { padding: Spacing.xs },
  skipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.label.fontSize,
    color: Colors.text.primary40,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },

  // Étape
  stepWrap: { flex: 1 },
  stepLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.primary.red,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 30,
    lineHeight: 38,
    color: Colors.text.primary100,
    marginBottom: Spacing.sm,
  },
  stepDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary70,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  // Inputs
  inputGroup: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.label.fontSize,
    color: Colors.text.primary70,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  input: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 20,
    color: Colors.text.primary100,
    paddingVertical: Spacing.xs,
    minHeight: 44,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: { paddingLeft: Spacing.sm },

  inputGroupError: { borderBottomColor: ERROR_COLOR },

  // Date de naissance : trois cases JJ / MM / AAAA
  birthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  birthCell: { flex: 1, minWidth: 0 },
  birthCellYear: { flex: 1.6 },
  birthInput: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 20,
    color: Colors.text.primary100,
    textAlign: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    minWidth: 0,
  },
  birthInputError: { borderColor: ERROR_COLOR },
  birthSep: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 20,
    color: Colors.text.primary40,
    paddingTop: 10,
  },
  birthHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.text.primary40,
    textAlign: 'center',
    marginTop: 3,
  },
  fieldOk: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary.red,
    marginTop: 6,
  },
  fieldError: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
    color: ERROR_COLOR,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  fieldErrorInside: { marginTop: 6, marginBottom: 0 },
  fieldHelp: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.text.primary40,
    marginTop: 6,
  },
  generalError: { marginTop: Spacing.md, textAlign: 'center' },
  inlineAction: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: Spacing.md },
  inlineActionText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: Colors.primary.red,
    textDecorationLine: 'underline',
  },
  selectBtnError: { borderColor: ERROR_COLOR },
  cityInput: { fontSize: 20 },
  phoneInput: { flex: 1, minWidth: 0 },
  gpsMessage: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.primary70,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: Spacing.sm },
  cancelBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 15,
    color: Colors.text.primary70,
  },

  // CGU
  termsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  termsBoxError: { borderColor: ERROR_COLOR },
  termsBoxActive: { borderColor: Colors.primary.red + '60', backgroundColor: Colors.primary.red + '06' },
  termsCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#CFC7C0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral.white,
    marginTop: 1,
  },
  termsCheckActive: { backgroundColor: Colors.primary.red, borderColor: Colors.primary.red },
  termsText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text.primary70,
  },
  termsLink: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
    textDecorationLine: 'underline',
  },
  termsVersion: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.text.primary40,
    marginTop: 4,
  },
  termsHint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.text.primary40,
    textAlign: 'center',
    marginTop: 10,
  },

  // GPS
  gpsBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  gpsBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  gpsBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.neutral.white,
  },

  // Or séparateur
  orRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.neutral.border },
  orText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.text.primary40,
  },

  // Selector
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  selectorText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 20,
    color: Colors.text.primary100,
  },
  selectorPlaceholder: { fontFamily: Typography.fontFamily.regular, color: Colors.text.primary40, fontSize: 16 },

  // Récap localisation
  locationRecap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  locationRecapGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  locationRecapText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.text.primary100,
  },

  // Scope cards
  scopeList: { gap: Spacing.md },
  scopeCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    padding: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  scopeCardActive: { borderColor: Colors.primary.red },
  scopeCardLeft: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  scopeIconWrap: {
    width: 44, height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeIconActive: { backgroundColor: 'transparent' },
  scopeIconGrad: {
    width: 44, height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.text.primary100,
  },
  scopeTitleActive: { color: Colors.primary.red },
  scopeSubtitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.text.primary40,
    marginBottom: 4,
  },
  scopeDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    color: Colors.text.primary70,
    lineHeight: 18,
  },
  scopeCheck: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  scopeCheckGrad: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  // Récap step 4
  recap: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  recapTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: Colors.text.primary100,
    marginBottom: Spacing.xs,
  },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between' },
  recapLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.text.primary40,
  },
  recapVal: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.text.primary100,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border + '50',
  },
  btnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  btnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.labelLarge.fontSize,
    color: Colors.neutral.white,
    letterSpacing: 0.2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  calendarSheet: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: BorderRadius.xl * 2,
    borderTopRightRadius: BorderRadius.xl * 2,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xxl,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: Colors.neutral.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: Colors.text.primary100,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },


  // Country/region list
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.text.primary100,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border + '40',
  },
  countryItemActive: { backgroundColor: Colors.primary.red + '06' },
  countryFlag: { fontFamily: Typography.fontFamily.regular, fontSize: 24 },
  countryName: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: Colors.text.primary100,
  },
  countryNameActive: { color: Colors.primary.red },

  // Gender Switch
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  genderBtnActive: {
    borderColor: Colors.primary.red,
    backgroundColor: Colors.primary.red + '08',
  },
  genderText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: Colors.text.primary70,
  },
  genderTextActive: { color: Colors.primary.red },

  // Phone input with country dial code
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dialCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  dialCodeFlag: {
    fontFamily: Typography.fontFamily.regular, fontSize: 20,
  },
  dialCodeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.text.primary100,
  },
  countryDialCodeBadge: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 13,
    color: Colors.text.primary40,
    marginRight: 6,
  },

  // ── Profession Selector & Modal ──────────────────────────────
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  selectBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  selectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F3F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIconWrapActive: {
    backgroundColor: Colors.primary.red + '12',
  },
  selectBtnTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.text.primary100,
  },
  selectBtnPlaceholder: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: Colors.text.primary40,
  },
  selectBtnSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11.5,
    color: Colors.primary.red,
    marginTop: 2,
  },
  sheetSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: Colors.text.primary70,
    marginTop: -4,
    marginBottom: 14,
  },
  customProfessionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary.red + '08',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary.red + '30',
    marginBottom: 12,
  },
  customPlusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customProfessionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 14,
    color: Colors.text.primary100,
  },
  professionList: {
    maxHeight: 420,
  },
  professionCategoryGroup: {
    marginBottom: 18,
  },
  professionCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border + '60',
    marginBottom: 6,
  },
  professionCategoryTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12.5,
    color: Colors.text.primary70,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  professionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  professionItemActive: {
    backgroundColor: Colors.primary.red + '08',
  },
  professionItemText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14.5,
    color: Colors.text.primary100,
  },
  professionItemTextActive: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
  },
  emptyProfessionWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyProfessionText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    color: Colors.text.primary40,
    textAlign: 'center',
  },
  emptyProfessionBtn: {
    backgroundColor: Colors.primary.red,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyProfessionBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13.5,
    color: '#FFF',
  },
});