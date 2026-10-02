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
import { ChevronLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AuthService } from '@/services/auth';
import { getReadableError } from '@/services/api';

/**
 * Étape 2 du mot de passe oublié : code à 6 chiffres + nouveau mot de passe.
 * Backend : POST /auth/reset-password { email, code, newPassword }
 * (400 si code incorrect / expiré, mot de passe ≥ 8 caractères).
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email: prefilled } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(prefilled || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const cleanCode = code.replace(/\D/g, '');
  const canSubmit = email.trim().length > 3 && cleanCode.length === 6 && password.length >= 8 && confirm === password;

  const handleSubmit = async () => {
    if (cleanCode.length !== 6) {
      Alert.alert('Code incomplet', 'Le code de réinitialisation contient 6 chiffres.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.resetPassword(email.trim().toLowerCase(), cleanCode, password);
      Alert.alert('Mot de passe modifié', 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.', [
        { text: 'Se connecter', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error) {
      Alert.alert('Réinitialisation impossible', getReadableError(error, 'Code incorrect ou expiré.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert('Adresse manquante', 'Saisissez votre adresse e-mail pour recevoir un nouveau code.');
      return;
    }
    setResending(true);
    try {
      await AuthService.forgotPassword(email.trim().toLowerCase());
      Alert.alert('Code envoyé', `Un nouveau code a été envoyé à ${email.trim()}.`);
    } catch (error) {
      Alert.alert('Envoi impossible', getReadableError(error));
    } finally {
      setResending(false);
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
        <Text style={styles.headerTitle}>Nouveau mot de passe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 32) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconHalo}>
          <ShieldCheck size={30} color={Colors.primary.red} />
        </View>
        <Text style={styles.title}>Choisissez un nouveau mot de passe</Text>
        <Text style={styles.subtitle}>Saisissez le code à 6 chiffres reçu par e-mail puis votre nouveau mot de passe.</Text>

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
          editable={!loading}
          testID="reset-email"
        />

        <Text style={styles.label}>Code de réinitialisation</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          placeholderTextColor={Colors.text.primary40}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          testID="reset-code"
        />

        <Text style={styles.label}>Nouveau mot de passe</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, paddingRight: 44 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 8 caractères"
            placeholderTextColor={Colors.text.primary40}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!loading}
            testID="reset-password"
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
            {showPassword ? <EyeOff size={20} color={Colors.text.primary70} /> : <Eye size={20} color={Colors.text.primary70} />}
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: Spacing.md }]}>Confirmer le mot de passe</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Répétez le mot de passe"
          placeholderTextColor={Colors.text.primary40}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!loading}
          testID="reset-confirm"
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
          style={[styles.btnWrap, (!canSubmit || loading) && styles.btnDisabled]}
          testID="reset-submit"
        >
          <LinearGradient
            colors={[Colors.primary.coral, Colors.primary.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Modifier mon mot de passe</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.secondaryLink} activeOpacity={0.7}>
          {resending ? (
            <ActivityIndicator size="small" color={Colors.primary.red} />
          ) : (
            <Text style={styles.secondaryLinkText}>Renvoyer un code</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F8' },
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
    backgroundColor: 'rgba(232, 64, 58, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
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
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.primary100,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  codeInput: { letterSpacing: 6, fontSize: 20, fontFamily: Typography.fontFamily.bold, textAlign: 'center' },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },
  btnWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.lg },
  btnDisabled: { opacity: 0.5 },
  btn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: '#FFFFFF' },
  secondaryLink: { alignItems: 'center', paddingVertical: Spacing.lg },
  secondaryLinkText: { fontFamily: Typography.fontFamily.medium, fontSize: 14, color: Colors.primary.red },
});
