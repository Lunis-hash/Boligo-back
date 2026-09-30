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
  Dimensions,
  Alert,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
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
import { PROFESSIONS_DATA, ALL_PROFESSIONS } from '@/constants/professions';

import { COUNTRIES, Country, detectUserCountry } from '@/constants/countries';

// ─── Écran principal ───────────────────────────────────────────────
import { useAuth } from '@/context/auth';
import { AuthService } from '@/services/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Options de préférences rencontre ─────────────────────────────
const MEETING_SCOPES = [
  {
    id: 'local',
    icon: MapPin,
    title: 'Local',
    subtitle: 'Même ville ou région',
    desc: 'Rencontrer des personnes près de chez toi, idéal pour des rendez-vous rapides.',
  },
  {
    id: 'national',
    icon: Users,
    title: 'National',
    subtitle: 'Tout mon pays',
    desc: 'Ouvrir les rencontres à tout ton pays pour plus de compatibilité.',
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
  onSkip,
}: {
  step: number;
  onBack: () => void;
  onSkip?: () => void;
}) {
  return (
    <View style={styles.navHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <ChevronLeft size={26} color={Colors.text.primary100} />
      </TouchableOpacity>

      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((s) => (
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

      {onSkip ? (
        <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
}

// ... (reste des constantes)

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const { signIn, signOut, token } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 — Identité + âge + profession
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [profession, setProfession] = useState('');
  const [showProfessionModal, setShowProfessionModal] = useState(false);
  const [professionSearch, setProfessionSearch] = useState('');
  const [birthday, setBirthday]     = useState<Date | null>(null);
  const [gender, setGender]         = useState<'H' | 'F' | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth]     = useState(new Date().getMonth());
  const [calYear, setCalYear]       = useState(new Date().getFullYear() - 25);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const filteredProfessions = ALL_PROFESSIONS.filter(p =>
    p.toLowerCase().includes(professionSearch.toLowerCase().trim())
  );

  // Step 2 — Localisation
  const [country, setCountry]       = useState<Country | null>(null);
  const [region, setRegion]         = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showRegionModal, setShowRegionModal]   = useState(false);
  const [countrySearch, setCountrySearch]       = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Step 3 — Préférences
  const [meetingScope, setMeetingScope] = useState<string | null>(null);

  // Step 4 — Compte & Téléphone avec indicatif pays
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone]                 = useState('');
  const [phoneDialCode, setPhoneDialCode] = useState('+33');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Auto-détection dynamique du pays au démarrage & reset session précédente
  useEffect(() => {
    if (token) {
      signOut().catch(() => {});
    }
    const detected = detectUserCountry();
    if (detected) {
      setCountry(detected);
      setPhoneDialCode(detected.dialCode);
      if (detected.regions.length > 0) {
        setRegion(detected.regions[0]);
      }
    }
  }, []);

  // Animations
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (nextStep: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = async () => {
    if (step < 4) animateTransition(step + 1);
    else {
      setIsSubmitting(true);
      try {
        const cleanPhone = phone.trim();
        const formattedPhone = cleanPhone
          ? (cleanPhone.startsWith('+') ? cleanPhone : `${phoneDialCode} ${cleanPhone}`)
          : undefined;

        const result = await AuthService.register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthday!.toISOString(),
          gender: gender!,
          city: `${region}, ${country?.name || ''}`,
          telephone: formattedPhone,
          job: profession.trim(),
          meetingScope: (meetingScope as 'local' | 'national' | 'international' | null) ?? undefined,
        });

        // Vérifier si le token est fourni ou si une vérification OTP est requise
        const token = result?.access_token || result?.token || result?.accessToken;
        const userId = result?.userId || result?.user?.id || result?.id || result?.user?._id || result?._id;
        const refreshToken = result?.refresh_token || result?.refreshToken;

        if (token) {
          await signIn(token, userId, refreshToken);
          router.replace('/interview/0');
        } else {
          // Le compte a été créé mais nécessite obligatoirement la validation du code OTP
          router.push({
            pathname: '/(auth)/verify',
            params: { email: email.trim() },
          });
        }
      } catch (error: any) {
        console.error('Registration failed:', error);
        const serverMsg = error.response?.data?.message;
        const isExisting = error.response?.status === 409 || (typeof serverMsg === 'string' && serverMsg.toLowerCase().includes('already exists'));

        if (isExisting) {
          Alert.alert(
            'Compte existant',
            'Un compte existe déjà avec cette adresse email. Souhaitez-vous vous connecter ?',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Se connecter',
                onPress: async () => {
                  try {
                    setIsSubmitting(true);
                    const loginRes = await AuthService.login(email.trim(), password);

                    // Si le compte n'est pas vérifié, redirection vers l'écran OTP
                    if (loginRes.isVerified === false || (!loginRes.access_token && loginRes.email)) {
                      router.push({
                        pathname: '/(auth)/verify',
                        params: { email: (loginRes.email || email).trim() },
                      });
                      return;
                    }

                    const lToken = loginRes?.access_token || loginRes?.token || loginRes?.accessToken;
                    const lUserId = loginRes?.userId || loginRes?.user?.id || loginRes?.id || loginRes?._id;
                    await signIn(lToken, lUserId, loginRes?.refresh_token || loginRes?.refreshToken);
                    router.replace('/interview/0');
                  } catch (loginErr) {
                    router.replace('/(auth)/login');
                  } finally {
                    setIsSubmitting(false);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Erreur', serverMsg || error.message || 'Une erreur est survenue lors de l\'inscription');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) animateTransition(step - 1);
    else {
      router.replace('/');
    }
  };

  // GPS
  const handleGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation dans vos paramètres.');
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const geo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo.length > 0) {
        const g = geo[0];
        const found = COUNTRIES.find(c => c.code === g.isoCountryCode);
        if (found) {
          setCountry(found);
          setPhoneDialCode(found.dialCode);
          const cityMatch = found.regions.find(r =>
            r.toLowerCase().includes((g.city || '').toLowerCase())
          );
          setRegion(cityMatch || g.city || '');
        }
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de récupérer votre position.');
    }
    setGpsLoading(false);
  };

  // Calendrier
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const DAYS_OF_WEEK = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const YEARS = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 18 - i);

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1;
  };

  const getAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  };

  const renderCalendarDays = () => {
    const total = getDaysInMonth(calMonth, calYear);
    const first = getFirstDay(calMonth, calYear);
    const els = [];
    for (let i = 0; i < first; i++) {
      els.push(<View key={`e${i}`} style={styles.calCell} />);
    }
    for (let d = 1; d <= total; d++) {
      const sel = birthday?.getDate() === d && birthday?.getMonth() === calMonth && birthday?.getFullYear() === calYear;
      els.push(
        <TouchableOpacity
          key={d}
          style={[styles.calCell, sel && styles.calCellActive]}
          onPress={() => setBirthday(new Date(calYear, calMonth, d))}
          activeOpacity={0.7}
        >
          {sel ? (
            <LinearGradient
              colors={[Colors.primary.red, Colors.primary.purple]}
              style={styles.calCellGradient}
            >
              <Text style={styles.calDayActive}>{d}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.calDay}>{d}</Text>
          )}
        </TouchableOpacity>
      );
    }
    return els;
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // ─── Validation par étape ────────────────────────────────────────
  const isStepValid = () => {
    if (step === 1) return firstName.trim().length >= 2 && profession.trim().length >= 2 && birthday !== null && gender !== null;
    if (step === 2) return country !== null && region.length > 0;
    if (step === 3) return meetingScope !== null;
    if (step === 4) {
      const isEmailValid = email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
      const isPasswordValid = password.length >= 8 && confirmPassword === password;
      const cleanPhone = phone.trim().replace(/[\s\-\.\(\)]/g, '');
      const isPhoneValid = cleanPhone.length >= 8 && /^[0-9+]+$/.test(cleanPhone);
      return isEmailValid && isPasswordValid && isPhoneValid;
    }
    return false;
  };

  // ─── Rendu étape 1 — Identité + Âge ────────────────────────────
  const renderStep1 = () => (
    <Animated.View style={[styles.stepWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.stepLabel}>Étape 1 sur 4</Text>
      <Text style={styles.stepTitle}>Commençons par{'\n'}vous connaître.</Text>
      <Text style={styles.stepDesc}>Ces informations restent privées et sécurisées.</Text>

      {/* Prénom */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Prénom *</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Votre prénom"
          placeholderTextColor={Colors.text.primary40}
          autoFocus
        />
      </View>

      {/* Nom */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Votre nom"
          placeholderTextColor={Colors.text.primary40}
        />
      </View>

      {/* Profession / Métier */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Profession / Métier *</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowProfessionModal(true)}
          activeOpacity={0.75}
        >
          <View style={styles.selectBtnLeft}>
            <View style={[styles.selectIconWrap, profession ? styles.selectIconWrapActive : null]}>
              <Briefcase size={17} color={profession ? Colors.primary.red : Colors.text.primary40} />
            </View>
            <View style={{ flex: 1 }}>
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
      </View>

      {/* Genre */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Je suis *</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            onPress={() => setGender('H')}
            style={[styles.genderBtn, gender === 'H' && styles.genderBtnActive]}
          >
            <Text style={[styles.genderEmoji, gender === 'H' && styles.genderEmojiActive]}>👨</Text>
            <Text style={[styles.genderText, gender === 'H' && styles.genderTextActive]}>Homme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGender('F')}
            style={[styles.genderBtn, gender === 'F' && styles.genderBtnActive]}
          >
            <Text style={[styles.genderEmoji, gender === 'F' && styles.genderEmojiActive]}>👩</Text>
            <Text style={[styles.genderText, gender === 'F' && styles.genderTextActive]}>Femme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date de naissance */}
      <View style={[styles.inputGroup, { borderBottomWidth: 0, marginTop: Spacing.md }]}>
        <Text style={styles.inputLabel}>Date de naissance *</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowCalendar(true)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={birthday ? [Colors.primary.red + '18', Colors.primary.purple + '10'] : ['#F8F8F8', '#F8F8F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dateBtnGradient}
          >
            <View style={styles.dateBtnLeft}>
              <LinearGradient
                colors={[Colors.primary.red, Colors.primary.purple]}
                style={styles.dateBtnIcon}
              >
                <Text style={{ fontSize: 16 }}>🎂</Text>
              </LinearGradient>
              <View>
                <Text style={styles.dateBtnTitle}>
                  {birthday
                    ? `${birthday.toLocaleDateString('fr-FR')} · ${getAge(birthday)} ans`
                    : 'Choisir ma date de naissance'}
                </Text>
                {!birthday && (
                  <Text style={styles.dateBtnSub}>Doit avoir 18 ans minimum</Text>
                )}
              </View>
            </View>
            <ChevronRight size={18} color={Colors.text.primary40} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // ─── Rendu étape 2 — Localisation ───────────────────────────────
  const renderStep2 = () => (
    <Animated.View style={[styles.stepWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.stepLabel}>Étape 2 sur 4</Text>
      <Text style={styles.stepTitle}>Où êtes-vous{'\n'}basé(e) ?</Text>
      <Text style={styles.stepDesc}>Pour vous connecter avec des personnes près de chez vous ou ailleurs.</Text>

      {/* Bouton GPS */}
      <TouchableOpacity
        style={styles.gpsBtn}
        onPress={handleGPS}
        activeOpacity={0.8}
        disabled={gpsLoading}
      >
        <LinearGradient
          colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gpsBtnGradient}
        >
          <Navigation size={18} color="#fff" />
          <Text style={styles.gpsBtnText}>
            {gpsLoading ? 'Détection en cours...' : 'Détecter ma position automatiquement'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>ou choisir manuellement</Text>
        <View style={styles.orLine} />
      </View>

      {/* Sélecteur pays */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Pays *</Text>
        <TouchableOpacity
          style={styles.selectorBtn}
          onPress={() => setShowCountryModal(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectorText, !country && styles.selectorPlaceholder]}>
            {country ? `${country.flag}  ${country.name}` : 'Sélectionner un pays'}
          </Text>
          <ChevronRight size={18} color={Colors.text.primary40} />
        </TouchableOpacity>
      </View>

      {/* Sélecteur région */}
      {country && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ville / Région *</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            onPress={() => setShowRegionModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectorText, !region && styles.selectorPlaceholder]}>
              {region || 'Sélectionner une ville'}
            </Text>
            <ChevronRight size={18} color={Colors.text.primary40} />
          </TouchableOpacity>
        </View>
      )}

      {/* Récap localisation */}
      {country && region && (
        <View style={styles.locationRecap}>
          <LinearGradient
            colors={[Colors.primary.red + '12', Colors.primary.purple + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.locationRecapGrad}
          >
            <MapPin size={16} color={Colors.primary.red} />
            <Text style={styles.locationRecapText}>
              {region}, {country.name} {country.flag}
            </Text>
          </LinearGradient>
        </View>
      )}
    </Animated.View>
  );

  // ─── Rendu étape 3 — Préférences rencontre ──────────────────────
  const renderStep3 = () => (
    <Animated.View style={[styles.stepWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.stepLabel}>Étape 3 sur 4</Text>
      <Text style={styles.stepTitle}>Où souhaitez-vous{'\n'}rencontrer ?</Text>
      <Text style={styles.stepDesc}>Vous pourrez modifier cette préférence à tout moment.</Text>

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
                <View style={{ flex: 1 }}>
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
    </Animated.View>
  );

  // ─── Rendu étape 4 — Compte ─────────────────────────────────────
  const renderStep4 = () => (
    <Animated.View style={[styles.stepWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.stepLabel}>Étape 4 sur 4</Text>
      <Text style={styles.stepTitle}>Créez votre{'\n'}compte sécurisé.</Text>
      <Text style={styles.stepDesc}>Vos données sont protégées et ne seront jamais partagées.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Adresse email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="exemple@email.com"
          placeholderTextColor={Colors.text.primary40}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Mot de passe */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mot de passe *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 8 caractères"
            placeholderTextColor={Colors.text.primary40}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
            {showPassword
              ? <EyeOff size={20} color={Colors.text.primary40} />
              : <Eye size={20} color={Colors.text.primary40} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmer le mot de passe */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Répétez votre mot de passe"
            placeholderTextColor={Colors.text.primary40}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn}>
            {showConfirmPassword
              ? <EyeOff size={20} color={Colors.text.primary40} />
              : <Eye size={20} color={Colors.text.primary40} />
            }
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Numéro de téléphone *</Text>
        <View style={styles.phoneInputRow}>
          <TouchableOpacity
            style={styles.dialCodeBtn}
            onPress={() => setShowCountryModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dialCodeFlag}>{country?.flag || '🌍'}</Text>
            <Text style={styles.dialCodeText}>{phoneDialCode}</Text>
            <ChevronRight size={14} color={Colors.text.primary40} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={phone}
            onChangeText={setPhone}
            placeholder={
              country?.code === 'CI' ? '07 01 02 03 04' :
              country?.code === 'SN' ? '77 123 45 67' :
              country?.code === 'CM' ? '6 71 23 45 67' :
              country?.code === 'FR' ? '6 12 34 56 78' :
              'Ex: 06 12 34 56 78'
            }
            placeholderTextColor={Colors.text.primary40}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Récap profil */}
      <View style={styles.recap}>
        <Text style={styles.recapTitle}>Récapitulatif</Text>
        <View style={styles.recapRow}>
          <Text style={styles.recapLabel}>Nom</Text>
          <Text style={styles.recapVal}>{firstName} {lastName}</Text>
        </View>
        {profession ? (
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Profession</Text>
            <Text style={styles.recapVal}>{profession}</Text>
          </View>
        ) : null}
        {birthday && (
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Âge</Text>
            <Text style={styles.recapVal}>{getAge(birthday)} ans</Text>
          </View>
        )}
        {country && region && (
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Localisation</Text>
            <Text style={styles.recapVal}>{region}, {country.flag} {country.name}</Text>
          </View>
        )}
        {phone.trim() ? (
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Téléphone</Text>
            <Text style={styles.recapVal}>{phoneDialCode} {phone.trim()}</Text>
          </View>
        ) : null}
        {meetingScope && (
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Rencontres</Text>
            <Text style={styles.recapVal}>
              {MEETING_SCOPES.find(s => s.id === meetingScope)?.title}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Footer bouton */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={isStepValid() ? 0.85 : 1}
          style={styles.btnWrap}
          disabled={!isStepValid() || isSubmitting}
        >
          <LinearGradient
            colors={isStepValid()
              ? [Colors.primary.red, Colors.primary.purple, Colors.primary.orange]
              : ['#DEDEDE', '#DEDEDE', '#DEDEDE']
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
              <Text style={[styles.btnText, !isStepValid() && { color: '#AAAAAA' }]}>
                {step === 4 ? 'Créer mon compte' : 'Continuer'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {step === 1 && (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
            style={{ marginTop: 14, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, color: Colors.primary.red, fontFamily: Typography.fontFamily.medium }}>
              Vous avez déjà un compte ? <Text style={{ textDecorationLine: 'underline', fontWeight: 'bold' }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Modal Calendrier ─────────────────────────────────────── */}
      <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCalendar(false)} />
          <View style={styles.calendarSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }} style={styles.calNavBtn}>
                <ChevronLeft size={22} color={Colors.text.primary100} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowYearPicker(v => !v)}
                style={styles.calTitleBtn}
              >
                <Text style={styles.calMonthText}>{MONTHS[calMonth]}</Text>
                <View style={styles.calYearRow}>
                  <Text style={styles.calYearText}>{calYear}</Text>
                  <ChevronRight
                    size={14}
                    color={Colors.primary.red}
                    style={{ transform: [{ rotate: showYearPicker ? '-90deg' : '90deg' }] }}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }} style={styles.calNavBtn}>
                <ChevronRight size={22} color={Colors.text.primary100} />
              </TouchableOpacity>
            </View>

            {showYearPicker ? (
              <ScrollView style={styles.yearPicker} showsVerticalScrollIndicator={false}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearItem, y === calYear && styles.yearItemActive]}
                    onPress={() => { setCalYear(y); setShowYearPicker(false); }}
                  >
                    <Text style={[styles.yearText, y === calYear && styles.yearTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View>
                <View style={styles.calDaysRow}>
                  {DAYS_OF_WEEK.map(d => (
                    <Text key={d} style={styles.calDayLabel}>{d}</Text>
                  ))}
                </View>
                <View style={styles.calGrid}>
                  {renderCalendarDays()}
                </View>
              </View>
            )}

            <View style={styles.calFooter}>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                activeOpacity={birthday ? 0.85 : 1}
                disabled={!birthday}
                style={styles.calConfirmWrap}
              >
                <LinearGradient
                  colors={birthday
                    ? [Colors.primary.red, Colors.primary.purple, Colors.primary.orange]
                    : ['#DEDEDE', '#DEDEDE', '#DEDEDE']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.calConfirmBtn}
                >
                  <Text style={[styles.calConfirmText, !birthday && { color: '#AAAAAA' }]}>
                    {birthday
                      ? `Confirmer — ${getAge(birthday)} ans`
                      : 'Sélectionner une date'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  Utiliser <Text style={{ fontWeight: 'bold', color: Colors.primary.red }}>« {professionSearch.trim()} »</Text>
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
                        <Text style={styles.professionCategoryIcon}>{category.icon}</Text>
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
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal Pays ───────────────────────────────────────────── */}
      <Modal visible={showCountryModal} transparent animationType="slide" onRequestClose={() => setShowCountryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCountryModal(false)} />
          <View style={[styles.calendarSheet, { maxHeight: '80%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choisir un pays</Text>

            <View style={styles.searchBar}>
              <Search size={16} color={Colors.text.primary40} />
              <TextInput
                style={styles.searchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Rechercher..."
                placeholderTextColor={Colors.text.primary40}
                autoFocus
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={c => c.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, country?.code === item.code && styles.countryItemActive]}
                  onPress={() => {
                    setCountry(item);
                    setPhoneDialCode(item.dialCode);
                    setRegion('');
                    setCountrySearch('');
                    setShowCountryModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, country?.code === item.code && styles.countryNameActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryDialCodeBadge}>{item.dialCode}</Text>
                  {country?.code === item.code && (
                    <Check size={16} color={Colors.primary.red} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── Modal Région ─────────────────────────────────────────── */}
      <Modal visible={showRegionModal} transparent animationType="slide" onRequestClose={() => setShowRegionModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowRegionModal(false)} />
          <View style={[styles.calendarSheet, { maxHeight: '70%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Ville / Région {country?.flag} {country?.name}
            </Text>
            <FlatList
              data={country?.regions || []}
              keyExtractor={r => r}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, region === item && styles.countryItemActive]}
                  onPress={() => { setRegion(item); setShowRegionModal(false); }}
                  activeOpacity={0.7}
                >
                  <MapPin size={16} color={region === item ? Colors.primary.red : Colors.text.primary40} />
                  <Text style={[styles.countryName, region === item && styles.countryNameActive]}>
                    {item}
                  </Text>
                  {region === item && (
                    <Check size={16} color={Colors.primary.red} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              )}
            />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
    fontFamily: Typography.fontFamily.bold,
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
    fontSize: 11,
    color: Colors.text.primary40,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  input: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 20,
    color: Colors.text.primary100,
    paddingVertical: Spacing.xs,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: { paddingLeft: Spacing.sm },

  // Date button
  dateBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.sm },
  dateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  dateBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  dateBtnIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBtnTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.text.primary100,
  },
  dateBtnSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 11,
    color: Colors.text.primary40,
    marginTop: 2,
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
  selectorPlaceholder: { color: Colors.text.primary40, fontSize: 16 },

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
    fontFamily: Typography.fontFamily.medium,
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

  // Calendar
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  calNavBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.neutral.backgroundLight,
    borderRadius: BorderRadius.md,
  },
  calTitleBtn: { alignItems: 'center', flex: 1 },
  calMonthText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: Colors.text.primary100,
  },
  calYearRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calYearText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary40,
  },
  calDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  calDayLabel: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.lg * 2) / 7,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
    color: Colors.text.primary40,
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  calCell: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.lg * 2) / 7,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
    marginBottom: 2,
  },
  calCellActive: { overflow: 'hidden' },
  calCellGradient: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  calDay: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: Colors.text.primary100,
  },
  calDayActive: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 15,
    color: Colors.neutral.white,
  },
  calFooter: { marginTop: Spacing.sm },
  calConfirmWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  calConfirmBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  calConfirmText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 15,
    color: Colors.neutral.white,
  },

  // Year picker
  yearPicker: { height: 260, marginBottom: Spacing.lg },
  yearItem: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border + '30',
  },
  yearItemActive: { backgroundColor: Colors.primary.red + '10' },
  yearText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 17,
    color: Colors.text.primary70,
  },
  yearTextActive: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
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
  countryFlag: { fontSize: 24 },
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
  genderEmoji: { fontSize: 20, opacity: 0.6 },
  genderEmojiActive: { opacity: 1 },
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
    fontSize: 20,
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
  professionCategoryIcon: {
    fontSize: 16,
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