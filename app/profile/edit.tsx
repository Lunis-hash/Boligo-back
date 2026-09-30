import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Save, ArrowLeft, Briefcase, MapPin, FileText, Heart, User, Phone, Mail, Calendar, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import client, { getReadableError } from '@/services/api';
import cacheService from '@/services/cacheService';

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', telephone: '', city: '',
    description: '', profession: '', displayedCity: '',
  });
  const [initialForm, setInitialForm] = useState(form);
  const [readOnly, setReadOnly] = useState<any>({});

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const resp = await client.get('/profile/me');
      const d = resp.data;
      const u = d.user || {};
      const loaded = {
        firstName: u.firstName || '', lastName: u.lastName || '',
        telephone: u.telephone || '', city: u.city || '',
        description: d.description || '', profession: d.profession || '',
        displayedCity: d.displayedCity || '',
      };
      setForm(loaded);
      setInitialForm(loaded);
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

    if (Object.keys(payload).length === 0) {
      Alert.alert('Aucune modification', 'Rien à enregistrer.');
      return;
    }

    setSaving(true);
    try {
      await client.patch('/profile/me', payload);
      cacheService.invalidate('user_profile_me');
      Alert.alert('Profil mis à jour ✨', 'Tes modifications ont été enregistrées.', [
        { text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')) },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', getReadableError(e, 'Mise à jour impossible'));
    } finally {
      setSaving(false);
    }
  };

  const u = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary.red} /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.main}>
      {/* HEADER */}
      <View style={styles.header}>
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
            <Text style={styles.bannerText}>Reste authentique, ton profil te ressemble.</Text>
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
            <TextInput style={styles.input} value={form.firstName} onChangeText={t => u('firstName', t)} placeholder="Ton prénom" placeholderTextColor={Colors.text.inactive} />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><User size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Nom</Text>
            </View>
            <TextInput style={styles.input} value={form.lastName} onChangeText={t => u('lastName', t)} placeholder="Ton nom" placeholderTextColor={Colors.text.inactive} />
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
              <Text style={styles.readOnlyText}>{readOnly.email}</Text>
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
              <Text style={styles.fieldLabel}>Ville de résidence</Text>
            </View>
            <TextInput style={styles.input} value={form.city} onChangeText={t => u('city', t)} placeholder="Abidjan, Dakar..." placeholderTextColor={Colors.text.inactive} />
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
              placeholder="Décris-toi en quelques lignes..." placeholderTextColor={Colors.text.inactive}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Briefcase size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Profession</Text>
            </View>
            <TextInput style={styles.input} value={form.profession} onChangeText={t => u('profession', t)} placeholder="Développeur, Médecin..." placeholderTextColor={Colors.text.inactive} />
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><MapPin size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Ville affichée</Text>
            </View>
            <TextInput style={styles.input} value={form.displayedCity} onChangeText={t => u('displayedCity', t)} placeholder="Visible par tes matchs" placeholderTextColor={Colors.text.inactive} />
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
              <Text style={styles.readOnlyText}>{readOnly.isVerified ? '✅ Oui' : '❌ Non'}</Text>
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <View style={styles.fieldHeader}>
              <View style={styles.iconCircle}><Calendar size={16} color={Colors.primary.red} /></View>
              <Text style={styles.fieldLabel}>Membre depuis</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyText}>{readOnly.accountStatus === 'actif' ? '🟢 Actif' : '🟡 Nouveau'}</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: Colors.neutral.white },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
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
  readOnlyText: { fontSize: 15, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary40 },
  lockBadge: { fontSize: 10, fontFamily: Typography.fontFamily.medium, color: Colors.text.inactive, backgroundColor: Colors.neutral.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: Colors.neutral.white, borderTopWidth: 1, borderTopColor: Colors.neutral.border },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17, borderRadius: BorderRadius.full },
  saveText: { color: Colors.neutral.white, fontSize: 16, fontFamily: Typography.fontFamily.bold },
});
