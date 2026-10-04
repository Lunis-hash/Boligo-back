import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import legal from '@/constants/legal.json';
import { formatLegalDate } from '@/components/LegalDocument';
import { MapPin, Edit3, Briefcase, ShieldCheck, ShieldAlert, Sparkles, TrendingUp, User, ChevronRight, Activity, Radar, Phone, Mail, Calendar, Heart, CreditCard, Tag, LogOut, Trash2 } from 'lucide-react-native';
import { Brand } from '@/constants/brand';
import { ModuleIcon } from '@/components/BrandIcons';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/context/auth';
import client, { getReadableError } from '@/services/api';
import cacheService from '@/services/cacheService';

/** Coupe au dernier mot complet (jamais au milieu d'un mot). */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/** Numéro du module (0 à 10) d'après son identifiant (« m3 ») ou son champ module. */
function moduleNumber(m: { id?: string; module?: number }): number | undefined {
  if (typeof m.module === 'number') return m.module;
  const n = Number(String(m.id ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) && String(m.id ?? '').match(/\d/) ? n : undefined;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, signOut } = useAuth();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFullAbout, setShowFullAbout] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rechargé à chaque retour sur l'onglet (ex. après « Modifier le profil »).
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const fetchProfile = async () => {
    const cached = cacheService.get<any>('user_profile_me', 30000);
    if (cached) {
      setProfileData(cached);
      setLoading(false);
    }

    try {
      const resp = await client.get('/profile/me');
      setProfileData(resp.data);
      cacheService.set('user_profile_me', resp.data);
    } catch (error) {
      if (!cached) Alert.alert('Profil indisponible', getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => {
        try { await signOut(); router.replace('/(auth)/login'); }
        catch (e) { Alert.alert('Erreur', 'Impossible de vous déconnecter'); }
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte ?',
      'Cette action est irréversible et supprimera définitivement toutes vos données (profil, messages, historique de matching et crédits).',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation définitive',
              'Êtes-vous absolument sûr ? Cette opération effacera toutes vos données et vous ne pourrez plus vous connecter.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Confirmer la suppression',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      await client.delete('/auth/delete-account');
                      await signOut();
                      Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès.');
                      router.replace('/(auth)/login');
                    } catch (e: any) {
                      setLoading(false);
                      const msg = e?.response?.data?.message || e?.message || 'Une erreur est survenue';
                      Alert.alert('Erreur', `Impossible de supprimer votre compte : ${msg}`);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" color={Colors.primary.red} /></View>;
  }

  const user = profileData?.user || {};
  const mentalMap = profileData?.mentalMap || {};
  // Fiche rédigée par le serveur à partir du Grand Entretien (bio, modules, valeurs).
  const portrait = profileData?.portrait || null;
  const profile = {
    description: profileData?.description || null,
    profession: profileData?.profession || null,
    displayedCity: profileData?.displayedCity || null,
    mainPhoto: profileData?.mainPhoto || null,
    profileStatus: profileData?.profileStatus || 'incomplet',
  };

  // Un module du Grand Entretien par ligne : pourcentage = clarté des réponses.
  const buildPillars = () => {
    const modules: any[] = Array.isArray(portrait?.modules) ? portrait.modules : [];
    return modules.map((m) => ({ id: m.id, module: moduleNumber(m), label: m.label, percentage: m.clarity, kpi: 'Clarté' }));
  };

  const buildNeeds = () => {
    const values: any[] = Array.isArray(portrait?.values) ? portrait.values : [];
    return values.map((v) => ({ id: v.id, title: v.label, text: 'Valeur clé' }));
  };

  const plain = (text: string) => text.replace(/\*\*/g, '');
  const fullAbout: string = profile.description || portrait?.bio || '';
  const aboutPreview = truncateAtWord(fullAbout, 140);
  const redFlags: string[] = Array.isArray(portrait?.redFlags) && portrait.redFlags.length > 0
    ? portrait.redFlags
    : Array.isArray(mentalMap.redFlags) ? mentalMap.redFlags : [];

  const age = user.birthDate ? new Date().getFullYear() - new Date(user.birthDate).getFullYear() : '?';
  const aboutText = fullAbout
    ? (showFullAbout ? fullAbout : aboutPreview)
    : 'Votre bio sera rédigée à la fin de votre Grand Entretien.';

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══ HEADER ═══ */}
        <Animated.View style={[styles.header, { paddingTop: insets.top + 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={[Colors.primary.red, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.abstractAvatar}>
              <User size={60} color={Colors.neutral.white} opacity={0.9} />
            </LinearGradient>
            <View style={styles.orbitBorder}>
              <Svg height="150" width="150" viewBox="0 0 150 150">
                <Circle cx="75" cy="75" r="72" stroke={Colors.primary.red} strokeWidth="1.5" strokeDasharray="8 8" fill="transparent" />
              </Svg>
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user.firstName || 'Utilisateur'} {user.lastName || ''}</Text>
            <View style={styles.locationContainer}>
              <MapPin size={14} color={Colors.text.primary40} style={{ marginTop: 2 }} />
              <Text style={styles.locationTextBold}>{profile.displayedCity || user.city || 'Non renseignée'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7} onPress={() => router.push('/profile/edit')}>
            <Edit3 size={22} color={Colors.text.primary100} />
          </TouchableOpacity>
        </Animated.View>

        {/* ═══ SECTION 1 : INFORMATIONS PERSONNELLES ═══ */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Informations personnelles</Text>
          <View style={styles.premiumCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><User size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Prénom</Text>
                <Text style={styles.infoValue}>{user.firstName || '—'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><User size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Nom</Text>
                <Text style={styles.infoValue}>{user.lastName || '—'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Calendar size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Date de naissance</Text>
                <Text style={styles.infoValue}>{user.birthDate ? new Date(user.birthDate).toLocaleDateString('fr-FR') : '—'} {age !== '?' ? `(${age} ans)` : ''}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Heart size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Genre</Text>
                <Text style={styles.infoValue}>{user.gender === 'H' ? 'Homme' : user.gender === 'F' ? 'Femme' : 'Autre'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><MapPin size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Ville</Text>
                <Text style={styles.infoValue}>{user.city || profile.displayedCity || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ SECTION 2 : COORDONNÉES ═══ */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Coordonnées</Text>
          <View style={styles.premiumCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Mail size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email || '—'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Phone size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{user.telephone || profileData?.telephone || 'Non renseigné'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ SECTION 3 : PROFIL PUBLIC ═══ */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Profil public</Text>
          <View style={styles.premiumCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Briefcase size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Profession</Text>
                <Text style={styles.infoValue}>{profile.profession || '—'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><MapPin size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Ville affichée</Text>
                <Text style={styles.infoValue}>{profile.displayedCity || user.city || '—'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Tag size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Statut du profil</Text>
                <Text style={styles.infoValue}>{profile.profileStatus === 'complet' ? 'Complet' : profile.profileStatus === 'actif' ? 'Actif' : 'Incomplet'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ SECTION 4 : À PROPOS ═══ */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={styles.sectionHeading}>À propos</Text>
            <TouchableOpacity 
              onPress={() => router.push('/profile/edit' as any)} 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(198, 42, 110,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
            >
              <Edit3 size={12} color={Colors.primary.red} />
              <Text style={{ fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.primary.red }}>Modifier</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contentCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={13} color={Colors.primary.orange} />
              <Text style={{ fontSize: 10, fontFamily: Typography.fontFamily.bold, color: Colors.primary.orange, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {profile.description ? 'Votre bio' : 'Rédigée par BOLIGO d’après vos réponses'}
              </Text>
            </View>
            <Text style={styles.bioText}>{aboutText}</Text>
            {!showFullAbout && aboutPreview !== fullAbout && (
              <TouchableOpacity onPress={() => setShowFullAbout(true)}>
                <Text style={styles.moreLink}>Lire la suite</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ═══ SECTION 5 : COMPTE ═══ */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Mon compte</Text>
          <View style={styles.premiumCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><CreditCard size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Crédits</Text>
                <Text style={styles.infoValue}>{user.creditBalance ?? 0} crédits</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><ShieldCheck size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Vérifié</Text>
                <Text style={styles.infoValue}>{user.isVerified ? 'Oui' : 'Non'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Activity size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Statut</Text>
                <Text style={styles.infoValue}>{user.accountStatus === 'actif' ? 'Actif' : user.accountStatus || 'Nouveau'}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}><Calendar size={18} color={Colors.primary.red} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Membre depuis</Text>
                <Text style={styles.infoValue}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ SECTION 6 : ANALYSE IA ═══ */}
        <View style={styles.section}>
          <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
              <Radar size={18} color={Colors.primary.red} />
              <Text style={styles.cardTitle}>ANALYSE BOLIGO</Text>
              <TouchableOpacity onPress={() => router.push('/interview/summary')}>
                <ChevronRight size={18} color={Colors.primary.red} />
              </TouchableOpacity>
            </View>

            <View style={styles.kpiGrid}>
              <View style={styles.kpiCell}>
                <Text style={styles.kpiLabel}>CLARTÉ</Text>
                <Text style={styles.kpiValue}>{portrait ? `${portrait.clarity}%` : '—'}</Text>
                <View style={styles.kpiTrend}><TrendingUp size={12} color={Colors.primary.orange} /><Text style={styles.kpiTrendText}>Réponses tranchées</Text></View>
              </View>
              <View style={styles.kpiDivider} />
              <View style={styles.kpiCell}>
                <Text style={styles.kpiLabel}>MODULES</Text>
                <Text style={styles.kpiValue}>{portrait ? `${portrait.modules?.length ?? 0}/11` : '—'}</Text>
                <View style={[styles.kpiTrend, { backgroundColor: Colors.primary.red + '10' }]}><Activity size={12} color={Colors.primary.red} /><Text style={[styles.kpiTrendText, { color: Colors.primary.red }]}>Analysés</Text></View>
              </View>
            </View>

            {!!portrait?.analysis && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>{plain(portrait.analysis)}</Text>
              </View>
            )}

            {buildPillars().length === 0 && (
              <Text style={styles.summaryText}>Terminez votre Grand Entretien pour découvrir votre analyse par module.</Text>
            )}

            <View style={styles.pillarGrid}>
              {buildPillars().map((pillar) => (
                <View key={pillar.id} style={styles.pillarItem}>
                  <View style={styles.pillarIconCircle}>
                    <ModuleIcon module={pillar.module} size={20} />
                  </View>
                  <View style={styles.pillarInfo}>
                    <Text style={styles.pillarLabel} numberOfLines={1}>{pillar.label}</Text>
                    <Text style={styles.pillarKpiText}>{pillar.kpi}</Text>
                  </View>
                  <Text style={styles.pillarPercent}>{pillar.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ═══ SECTION 7 : VALEURS ═══ */}
        {buildNeeds().length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Vos valeurs clés</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {buildNeeds().map((need) => (
              <View key={need.id} style={styles.needCard}>
                <View style={styles.needIcon}><Heart size={18} color={Brand.framboise} strokeWidth={1.9} /></View>
                <Text style={styles.needTitle}>{need.title}</Text>
                <Text style={styles.needSub}>{need.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
        )}

        {/* ═══ SECTION 8 : LIGNES ROUGES ═══ */}
        {redFlags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Vos lignes rouges</Text>
            <View style={styles.contentCard}>
              {redFlags.map((flag: string, i: number) => (
                <View key={i} style={styles.redFlagRow}>
                  <ShieldAlert size={16} color={Brand.framboise} strokeWidth={1.9} />
                  <Text style={styles.redFlagText}>{flag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ ACTIONS ═══ */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.primaryAction} activeOpacity={0.8} onPress={() => router.push('/profile/edit')}>
            <Edit3 size={20} color={Colors.neutral.white} />
            <Text style={styles.primaryActionText}>Modifier mon profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} activeOpacity={0.7} onPress={() => router.push('/interview/summary')}>
            <Sparkles size={20} color={Colors.primary.red} />
            <Text style={styles.secondaryActionText}>Voir l'Analyse Détaillée</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ INFORMATIONS LÉGALES ═══ */}
        <View style={styles.legalSection}>
          <TouchableOpacity style={styles.legalRow} activeOpacity={0.7} onPress={() => router.push('/legal/cgu' as any)} testID="legal-cgu-link">
            <Text style={styles.legalRowText}>Conditions Générales d'Utilisation et de Vente</Text>
            <ChevronRight size={18} color={Colors.text.primary40} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.legalRow} activeOpacity={0.7} onPress={() => router.push('/legal/confidentialite' as any)} testID="legal-privacy-link">
            <Text style={styles.legalRowText}>Politique de confidentialité</Text>
            <ChevronRight size={18} color={Colors.text.primary40} />
          </TouchableOpacity>
          <Text style={styles.legalVersion}>Textes légaux · version du {formatLegalDate(legal.version)}</Text>
        </View>

        {/* LOGOUT & DELETE ACCOUNT */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7} onPress={handleLogout}>
            <LogOut size={20} color={Colors.primary.red} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { marginTop: 12, borderColor: Brand.danger }]} 
            activeOpacity={0.7} 
            onPress={handleDeleteAccount}
          >
            <Trash2 size={20} color={Brand.danger} />
            <Text style={[styles.logoutText, { color: Brand.danger }]}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.neutral.white },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 60 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral.white },

  // Header
  header: { alignItems: 'center', paddingBottom: 20 },
  avatarWrapper: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  abstractAvatar: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: Colors.neutral.white, elevation: 5, shadowColor: Colors.primary.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  orbitBorder: { position: 'absolute', top: 0, left: 0 },
  verificationBadge: { position: 'absolute', bottom: 12, right: 15, backgroundColor: Colors.primary.red, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.neutral.white, elevation: 3 },
  headerInfo: { alignItems: 'center', marginTop: 15, paddingHorizontal: 20 },
  name: { fontSize: 28, fontFamily: Typography.fontFamily.serif, color: Colors.text.primary100, marginBottom: 8, textAlign: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.neutral.backgroundLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  locationTextBold: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  settingsBtn: { position: 'absolute', top: 60, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.neutral.backgroundLight, justifyContent: 'center', alignItems: 'center' },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 30 },
  sectionHeading: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, marginBottom: 15 },

  // Info card
  premiumCard: { backgroundColor: Colors.neutral.white, borderRadius: 32, padding: 20, borderWidth: 1, borderColor: Colors.neutral.border, shadowColor: Colors.neutral.black, shadowOpacity: 0.04, shadowRadius: 20, elevation: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  infoIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary.red + '08', justifyContent: 'center', alignItems: 'center' },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.text.primary40, marginBottom: 2 },
  infoValue: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  infoDivider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: 54 },

  // KPI
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.primary.red, letterSpacing: 1.5, flex: 1 },
  kpiGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, backgroundColor: Colors.neutral.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.neutral.border, shadowColor: Colors.neutral.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10 },
  kpiCell: { flex: 1, alignItems: 'center' },
  kpiDivider: { width: 1, height: 40, backgroundColor: Colors.neutral.border },
  kpiLabel: { fontSize: 10, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary40, letterSpacing: 1, marginBottom: 6 },
  kpiValue: { fontSize: 20, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, marginBottom: 4 },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary.orange + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  kpiTrendText: { fontSize: 10, fontFamily: Typography.fontFamily.bold, color: Colors.primary.orange },
  summaryContainer: { marginBottom: 25, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border, paddingBottom: 25 },
  summaryText: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 24, color: Colors.text.primary70, fontStyle: 'italic', textAlign: 'center' },
  pillarGrid: { gap: 12 },
  pillarItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral.white, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: Colors.neutral.border },
  pillarIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary.red + '05', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pillarEmoji: { fontFamily: Typography.fontFamily.regular, fontSize: 22 },
  pillarInfo: { flex: 1, gap: 4 },
  pillarLabel: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  pillarKpiText: { fontSize: 12, color: Colors.primary.red, fontFamily: Typography.fontFamily.medium },
  pillarPercent: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },

  // Bio
  contentCard: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: 24, padding: 24 },
  bioText: { fontFamily: Typography.fontFamily.regular, fontSize: 15, lineHeight: 26, color: Colors.text.primary70 },
  moreLink: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.primary.red, marginTop: 15 },

  // Needs
  horizontalScroll: { gap: 14 },
  needCard: { width: 160, backgroundColor: Colors.primary.red + '05', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: Colors.primary.red + '15' },
  needIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.rose, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  needTitle: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, marginBottom: 6 },
  needSub: { fontFamily: Typography.fontFamily.regular, fontSize: 13, color: Colors.text.primary70, lineHeight: 18 },

  // Red flags
  redFlagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border + '50' },
  redFlagDot: { fontFamily: Typography.fontFamily.regular, fontSize: 16 },
  redFlagText: { flex: 1, fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.text.primary70, lineHeight: 20 },

  // Footer
  footerActions: { paddingHorizontal: 20, marginVertical: 30, gap: 14 },
  primaryAction: { backgroundColor: Colors.primary.red, paddingVertical: 18, borderRadius: BorderRadius.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: Colors.primary.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  primaryActionText: { color: Colors.neutral.white, fontSize: 16, fontFamily: Typography.fontFamily.bold },
  secondaryAction: { paddingVertical: 18, borderRadius: BorderRadius.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: Colors.primary.red + '30', backgroundColor: Colors.primary.red + '05' },
  secondaryActionText: { color: Colors.primary.red, fontSize: 16, fontFamily: Typography.fontFamily.bold },

  legalSection: { paddingHorizontal: 20, paddingBottom: 12 },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  legalRowText: { flex: 1, paddingRight: 12, fontFamily: Typography.fontFamily.regular, fontSize: 14, color: Colors.text.primary70 },
  legalVersion: { fontFamily: Typography.fontFamily.regular, fontSize: 11, color: Colors.text.primary40, marginTop: 10 },
  logoutSection: { paddingHorizontal: 20, paddingBottom: 40 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: BorderRadius.full, borderWidth: 2, borderColor: Colors.primary.red + '30', backgroundColor: Colors.neutral.white },
  logoutText: { color: Colors.primary.red, fontSize: 16, fontFamily: Typography.fontFamily.bold },
});
