import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, KeyRound } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { AuthService } from '@/services/auth';
import { getReadableError } from '@/services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Étape 1 du mot de passe oublié : saisie de l'e-mail.
 * Backend : POST /auth/forgot-password → code à 6 chiffres envoyé par e-mail
 * (404 si aucun compte n'est associé à l'adresse).
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email: prefilled } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(prefilled || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(value)) {
      Alert.alert('Adresse invalide', 'Veuillez saisir une adresse e-mail valide.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.forgotPassword(value);
      router.push({ pathname: '/(auth)/reset-password', params: { email: value } });
    } catch (error: any) {
      const status = error?.response?.status;
      Alert.alert(
        'Envoi impossible',
        status === 404 ? 'Aucun compte associé à cette adresse e-mail.' : getReadableError(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 24) }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} color={Colors.text.primary100} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mot de passe oublié</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconHalo}>
          <KeyRound size={30} color={Colors.primary.red} />
        </View>
        <Text style={styles.title}>Réinitialisez votre mot de passe</Text>
        <Text style={styles.subtitle}>
          Saisissez l'adresse e-mail de votre compte. Nous vous enverrons un code à 6 chiffres valable 15 minutes.
        </Text>

        <Text style={styles.label}>Adresse e-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="votre@email.com"
          placeholderTextColor={Colors.text.primary40}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!loading}
          testID="forgot-email"
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !email.trim()}
          activeOpacity={0.85}
          style={[styles.btnWrap, (!email.trim() || loading) && styles.btnDisabled]}
          testID="forgot-submit"
        >
          <LinearGradient
            colors={[Colors.primary.coral, Colors.primary.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Recevoir le code</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(auth)/reset-password', params: email.trim() ? { email: email.trim() } : {} })}
          style={styles.secondaryLink}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryLinkText}>J'ai déjà un code</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.fond },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20, 16, 14, 0.06)',
  },
  headerTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.text.primary100 },
  content: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  iconHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(198, 42, 110, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: 24,
    color: Colors.text.primary100,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text.primary70,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.label.fontSize,
    color: Colors.text.primary100,
    marginBottom: Spacing.sm,
  },
  input: {
    fontFamily: Typography.fontFamily.regular, borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary100,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.lg,
  },
  btnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  btnDisabled: { opacity: 0.5 },
  btn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: '#FFFFFF' },
  secondaryLink: { alignItems: 'center', paddingVertical: Spacing.lg },
  secondaryLinkText: { fontFamily: Typography.fontFamily.medium, fontSize: 14, color: Colors.primary.red },
});
