import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Save, ArrowLeft, Briefcase, MapPin, FileText, Heart, User, Phone, Mail, Calendar, ShieldCheck, Globe, Users, Navigation, ChevronRight, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client, { getReadableError } from '@/services/api';
import cacheService from '@/services/cacheService';
import { COUNTRIES, Country } from '@/constants/countries';
import { detectPlace, LocationPermissionError, normName, splitResidence } from '@/services/location';

type MeetingScope = 'local' | 'national' | 'international';

/** Périmètres proposés à l'inscription (étape 3), modifiables ici. */
const MEETING_SCOPES: { id: MeetingScope; label: string; hint: string; Icon: typeof MapPin }[] = [
  { id: 'local', label: 'Local', hint: 'Même ville ou région', Icon: MapPin },
  { id: 'national', label: 'National', hint: 'Tout mon pays', Icon: Users },
  { id: 'international', label: 'International', hint: 'Partout dans le monde', Icon: Globe },
];


export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', telephone: '',
    description: '', profession: '', displayedCity: '',
  });
  const [initialForm, setInitialForm] = useState(form);
  const [readOnly, setReadOnly] = useState<any>({});
  // Ville de résidence (sert aux filtres de la Découverte) : pays de la liste + ville.
  const [residenceCity, setResidenceCity] = useState('');
  const [residenceCountry, setResidenceCountry] = useState<Country | null>(null);
  const [initialResidence, setInitialResidence] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [meetingScope, setMeetingScope] = useState<MeetingScope | null>(null);
  const [initialScope, setInitialScope] = useState<MeetingScope | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const resp = await client.get('/profile/me');
      const d = resp.data;
      const u = d.user || {};
      const loaded = {
        firstName: u.firstName || '', lastName: u.lastName || '',
        telephone: u.telephone || '',
        description: d.description || '', profession: d.profession || '',
        displayedCity: d.displayedCity || '',
      };
      setForm(loaded);
      setInitialForm(loaded);
      const residence = splitResidence(u.city || '');
      setResidenceCity(residence.city);
      setResidenceCountry(residence.country);
      setInitialResidence(u.city || '');
      setMeetingScope(d.meetingScope ?? null);
      setInitialScope(d.meetingScope ?? null);
      setReadOnly({
        email: u.email || '',
        gender: u.gender || '',
        birthDate: u.birthDate || '',
        isVerified: u.isVerified || false,
        creditBalance: u.creditBalance ?? 0,
        accountStatus: u.accountStatus || '',
      });
    } catch (e) {
      Alert.alert('Profil indisponible', getReadableError(e), [
        { text: 'Réessayer', onPress: () => loadProfile() },
        { text: 'Retour', style: 'cancel', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (form.profession.trim() && form.profession.trim().length < 2) {
      Alert.alert('Profession invalide', 'La profession doit contenir au moins 2 caractères.');
      return;
    }

    if (!form.firstName.trim()) {
      Alert.alert('Prénom requis', 'Le prénom ne peut pas être vide.');
      return;
    }

    // Seuls les champs modifiés et non vides sont envoyés : le backend
    // refuse une profession vide (400) et une chaîne vide pour le téléphone
    // viole l'unicité dès qu'un autre membre n'a pas de numéro (500).
    const payload: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((key) => {
      const value = form[key].trim();
      if (value && value !== (initialForm[key] || '').trim()) payload[key] = value;
    });
    const residence = residenceValue();
    if (residence && residence !== initialResidence.trim()) payload.city = residence;
    if (meetingScope && meetingScope !== initialScope) payload.meetingScope = meetingScope;

    if (Object.keys(payload).length === 0) {
      Alert.alert('Aucune modification', 'Rien à enregistrer.');
      return;
    }

    setSaving(true);
    try {
      await client.patch('/profile/me', payload);
      cacheService.invalidate('user_profile_me');
      Alert.alert('Profil mis à jour', 'Vos modifications sont enregistrées.', [
        { text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')) },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', getReadableError(e, 'Mise à jour impossible'));
    } finally {
      setSaving(false);
    }
  };

  const u = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  /** « Ville, Pays » envoyé au serveur (la virgule sépare la ville du pays). */
  const residenceValue = () => {
    const city = residenceCity.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!city) return '';
    return residenceCountry ? `${city}, ${residenceCountry.name}` : city;
  };

  const handleLocate = async () => {
    setLocating(true);
    try {
      const place = await detectPlace();
      if (place.country) setResidenceCountry(place.country);
      if (place.city) setResidenceCity(place.city);
      if (!place.country || !place.city) {
        Alert.alert('Position partielle', 'Complétez votre pays ou votre ville à la main.');
      }
    } catch (e) {
      Alert.alert(
        e instanceof LocationPermissionError ? 'Permission refusée' : 'Position introuvable',
        'Choisissez votre pays et saisissez votre ville à la main.',
      );
    } finally {
      setLocating(false);
    }
  };

  const filteredCountries = COUNTRIES.filter((c) => normName(c.name).includes(normName(countrySearch)));

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary.red} /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.main}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.text.primary100} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* BANNER */}
        <View style={styles.banner}>
          <LinearGradient
            colors={[Colors.primary.red + '12', Colors.primary.purple + '08']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.bannerGrad}
          >
            <Heart size={24} color={Colors.primary.red} />
            <Text style={styles.bannerText}>Restez authentique : votre profil doit vous ressembler.</Text>
          </LinearGradient>
        </View>

        {/* ═══ SECTION 1 : IDENTITÉ ═══ */}
        <Text style={styles.sectionTitle}>Identité</Text>
        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><User size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Prénom</Text>
            </View>
            <TextInput style={styles.input} value={form.firstName} onChangeText={t => u('firstName', t)} placeholder="Votre prénom" placeholderTextColor={Colors.text.inactive} />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><User size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Nom</Text>
            </View>
            <TextInput style={styles.input} value={form.lastName} onChangeText={t => u('lastName', t)} placeholder="Votre nom" placeholderTextColor={Colors.text.inactive} />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Calendar size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Date de naissance</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText}>{readOnly.birthDate ? new Date(readOnly.birthDate).toLocaleDateString('fr-FR') : '—'}</Text>
              <Text style={styles.lockBadge}>Non modifiable</Text>
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Heart size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Genre</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText}>{readOnly.gender === 'H' ? 'Homme' : readOnly.gender === 'F' ? 'Femme' : 'Autre'}</Text>
              <Text style={styles.lockBadge}>Non modifiable</Text>
            </View>
          </View>
        </View>

        {/* ═══ SECTION 2 : COORDONNÉES ═══ */}
        <Text style={styles.sectionTitle}>Coordonnées</Text>
        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Mail size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Email</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText} numberOfLines={1} ellipsizeMode="middle">{readOnly.email}</Text>
              <Text style={styles.lockBadge}>Non modifiable</Text>
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Phone size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Téléphone</Text>
            </View>
            <TextInput style={styles.input} value={form.telephone} onChangeText={t => u('telephone', t)} placeholder="+33 6 12 34 56 78 ou +225 07..." placeholderTextColor={Colors.text.inactive} keyboardType="phone-pad" />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><MapPin size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Pays de résidence</Text>
            </View>
            <TouchableOpacity style={styles.selector} onPress={() => setShowCountryModal(true)} activeOpacity={0.7} testID="residence-country">
              <Text style={[styles.selectorText, !residenceCountry && styles.selectorPlaceholder]}>
                {residenceCountry ? `${residenceCountry.flag}  ${residenceCountry.name}` : 'Choisir un pays'}
              </Text>
              <ChevronRight size={18} color={Colors.text.primary40} />
            </TouchableOpacity>
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><MapPin size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Ville de résidence</Text>
            </View>
            <TextInput style={styles.input} value={residenceCity} onChangeText={setResidenceCity} placeholder="Abidjan, Dakar…" placeholderTextColor={Colors.text.inactive} testID="residence-city" />
            <TouchableOpacity style={styles.locateBtn} onPress={handleLocate} disabled={locating} activeOpacity={0.7}>
              <Navigation size={14} color={Colors.primary.red} />
              <Text style={styles.locateText}>{locating ? 'Détection en cours…' : 'Détecter ma position'}</Text>
            </TouchableOpacity>
            <Text style={styles.fieldHint}>Votre pays et votre ville déterminent les profils proposés selon votre périmètre.</Text>
          </View>
        </View>

        {/* ═══ PÉRIMÈTRE DE RENCONTRE (réponse M0_Q02) ═══ */}
        <Text style={styles.sectionTitle}>Où souhaitez-vous rencontrer ?</Text>
        <View style={styles.card}>
          <View style={styles.scopeRow}>
            {MEETING_SCOPES.map(({ id, label, hint, Icon }) => {
              const selected = meetingScope === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.scopeChip, selected && styles.scopeChipActive]}
                  onPress={() => setMeetingScope(id)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`scope-${id}`}
                >
                  <Icon size={18} color={selected ? Colors.primary.red : Colors.text.primary40} />
                  <Text style={[styles.scopeLabel, selected && styles.scopeLabelActive]}>{label}</Text>
                  <Text style={styles.scopeHint}>{hint}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ═══ SECTION 3 : PROFIL PUBLIC ═══ */}
        <Text style={styles.sectionTitle}>Profil public</Text>
        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><FileText size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>À propos de moi</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline numberOfLines={4}
              value={form.description} onChangeText={t => u('description', t)}
              placeholder="Présentez-vous en quelques lignes…" placeholderTextColor={Colors.text.inactive}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Briefcase size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Profession</Text>
            </View>
            <TextInput style={styles.input} value={form.profession} onChangeText={t => u('profession', t)} placeholder="Développeur, médecin…" placeholderTextColor={Colors.text.inactive} />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><MapPin size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Ville affichée</Text>
            </View>
            <TextInput style={styles.input} value={form.displayedCity} onChangeText={t => u('displayedCity', t)} placeholder="Visible par vos rencontres" placeholderTextColor={Colors.text.inactive} />
          </View>
        </View>

        {/* ═══ SECTION 4 : COMPTE (lecture seule) ═══ */}
        <Text style={styles.sectionTitle}>Mon compte</Text>
        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><ShieldCheck size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Vérifié</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText}>{readOnly.isVerified ? 'Oui' : 'Pas encore'}</Text>
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Calendar size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Statut du compte</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText}>{readOnly.accountStatus === 'actif' ? 'Actif' : 'Nouveau'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* SAVE */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85} disabled={saving}>
          <LinearGradient
            colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveText}>Enregistrer</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Modal visible={showCountryModal} transparent animationType="slide" onRequestClose={() => setShowCountryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCountryModal(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pays de résidence</Text>
            <View style={styles.searchBar}>
              <Search size={16} color={Colors.text.primary40} />
              <TextInput style={styles.searchInput} value={countrySearch} onChangeText={setCountrySearch} placeholder="Rechercher…" placeholderTextColor={Colors.text.primary40} />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => { setResidenceCountry(item); setCountrySearch(''); setShowCountryModal(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, residenceCountry?.code === item.code && styles.countryNameActive]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: Colors.neutral.white },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.neutral.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },

  // Banner
  banner: { marginBottom: 4 },
  bannerGrad: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: BorderRadius.xl },
  bannerText: { flex: 1, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.text.primary70, lineHeight: 22 },

  // Section
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, marginTop: 8 },

  // Card
  card: { backgroundColor: Colors.neutral.white, borderRadius: 32, padding: 20, borderWidth: 1, borderColor: Colors.neutral.border, gap: 16 },
  fieldWrap: { gap: 8 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary.red + '08', justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary70 },

  // Input
  input: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary100, borderWidth: 1, borderColor: Colors.neutral.border },
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },

  // Read-only
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.neutral.backgroundLight, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: Colors.neutral.border },
  readOnlyText: { flex: 1, minWidth: 0, marginRight: 8, fontSize: 15, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary40 },
  lockBadge: { flexShrink: 0, fontSize: 10, fontFamily: Typography.fontFamily.medium, color: Colors.text.inactive, backgroundColor: Colors.neutral.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },

  // Lieu et périmètre
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.neutral.backgroundLight, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: Colors.neutral.border },
  selectorText: { fontSize: 15, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary100 },
  selectorPlaceholder: { color: Colors.text.inactive },
  locateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  locateText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.primary.red },
  fieldHint: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary40, lineHeight: 18 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scopeChip: { flexGrow: 1, flexBasis: 140, gap: 4, padding: 14, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.neutral.border, backgroundColor: Colors.neutral.backgroundLight },
  scopeChipActive: { borderColor: Colors.primary.red, backgroundColor: Colors.primary.red + '08' },
  scopeLabel: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary70 },
  scopeLabelActive: { color: Colors.primary.red },
  scopeHint: { fontSize: 12, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '75%', backgroundColor: Colors.neutral.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  sheetTitle: { fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.neutral.backgroundLight, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary100 },
  countryItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border + '40' },
  countryFlag: { fontSize: 22 },
  countryName: { fontSize: 15, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary100 },
  countryNameActive: { fontFamily: Typography.fontFamily.bold, color: Colors.primary.red },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: Colors.neutral.white, borderTopWidth: 1, borderTopColor: Colors.neutral.border },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: BorderRadius.full },
  saveText: { color: Colors.neutral.white, fontSize: 16, fontFamily: Typography.fontFamily.bold },
});
