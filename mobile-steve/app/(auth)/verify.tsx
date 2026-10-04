import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Mail, RefreshCw, Edit3, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { AuthService } from '@/services/auth';
import { useAuth } from '@/context/auth';

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const userEmail = email || '';
  const { signIn } = useAuth();

  const [code, setCode] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (value: string, index: number) => {
    // Si l'utilisateur colle un code à 4 chiffres d'un coup
    if (value.length > 1) {
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 4);
      if (cleaned.length === 4) {
        const newCode = cleaned.split('');
        setCode(newCode);
        handleVerify(cleaned);
        return;
      }
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit si 4 chiffres remplis
    if (newCode.every((digit) => digit !== '') && newCode.join('').length === 4) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    if (!userEmail) {
      Alert.alert('Erreur', 'Adresse e-mail introuvable.');
      return;
    }
    if (codeToVerify.length !== 4) {
      Alert.alert('Code incomplet', 'Veuillez saisir les 4 chiffres de votre code de validation.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.verifyEmail(userEmail, codeToVerify);
      if (res.access_token) {
        await signIn(res.access_token, res.userId, res.refresh_token);
        router.replace('/interview/0');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Code de vérification invalide ou expiré.';
      Alert.alert('Vérification impossible', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userEmail) {
      Alert.alert('Erreur', 'Adresse e-mail introuvable.');
      return;
    }
    setIsResending(true);
    try {
      await AuthService.resendVerification(userEmail);
      setTimer(60);
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Nouveau code envoyé', `Un nouveau code à 4 chiffres a été envoyé à ${userEmail}.`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Impossible de renvoyer le code pour le moment.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setIsResending(false);
    }
  };

  const isCodeComplete = code.every((d) => d !== '');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Soft Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={22} color={Colors.text.primary100} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Soft Mail Halo Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconHaloOuter}>
              <View style={styles.iconHaloInner}>
                <Mail size={32} color={Colors.primary.red} strokeWidth={2.2} />
              </View>
            </View>
          </View>

          {/* Titles */}
          <Text style={styles.mainTitle}>Validez votre e-mail</Text>
          <Text style={styles.subTitle}>
            Nous avons envoyé un code à 4 chiffres à l'adresse suivante :
          </Text>

          {/* Email Badge with Edit Option */}
          <View style={styles.emailPill}>
            <Text style={styles.emailPillText} numberOfLines={1}>
              {userEmail || 'votre@email.com'}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.editEmailBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Edit3 size={14} color={Colors.primary.red} />
            </TouchableOpacity>
          </View>

          {/* 4-digit Input Boxes */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => {
              const isFocused = index === code.findIndex((d) => d === '');
              return (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    digit ? styles.codeInputFilled : null,
                    isFocused ? styles.codeInputActive : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={4}
                  selectTextOnFocus
                  editable={!loading}
                />
              );
            })}
          </View>

          {/* Action Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, !isCodeComplete && styles.confirmBtnDisabled]}
            onPress={() => handleVerify()}
            disabled={!isCodeComplete || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                isCodeComplete
                  ? [Colors.primary.coral, Colors.primary.red]
                  : ['#E0DFDD', '#D2D0CD']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.confirmBtnRow}>
                  <Text style={styles.confirmBtnText}>Valider mon compte</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            {timer > 0 ? (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>
                  Renvoyer un code dans <Text style={styles.timerCount}>{formatTimer(timer)}</Text>
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={isResending}
                activeOpacity={0.7}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={Colors.primary.red} />
                ) : (
                  <View style={styles.resendBtnRow}>
                    <RefreshCw size={15} color={Colors.primary.red} />
                    <Text style={styles.resendBtnText}>Renvoyer un nouveau code</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Spam Notice */}
          <View style={styles.noticeBox}>
            <ShieldCheck size={16} color={Colors.text.primary40} />
            <Text style={styles.noticeText}>
              Vous ne trouvez pas l'e-mail ? Pensez à vérifier vos courriers indésirables (spams).
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: '#FAF9F8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(20, 16, 14, 0.06)',
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: Colors.text.primary100,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHaloOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(198, 42, 110, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHaloInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(198, 42, 110, 0.15)',
  },
  mainTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 26,
    color: Colors.text.primary100,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: 8,
  },
  subTitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14.5,
    color: Colors.text.primary70,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: Spacing.md,
    marginBottom: 14,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 42, 110, 0.2)',
    marginBottom: Spacing.xl,
  },
  emailPillText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.primary.red,
  },
  editEmailBtn: {
    padding: 2,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
    justifyContent: 'center',
  },
  codeInput: {
    width: 62,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(20, 16, 14, 0.1)',
    textAlign: 'center',
    fontSize: 28,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  codeInputActive: {
    borderColor: Colors.primary.red,
    backgroundColor: '#FFFDFD',
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  codeInputFilled: {
    borderColor: 'rgba(198, 42, 110, 0.4)',
    color: Colors.primary.red,
    backgroundColor: '#FFF9F8',
  },
  confirmBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: Spacing.lg,
  },
  confirmBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0ECE8',
  },
  timerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13.5,
    color: Colors.text.primary70,
  },
  timerCount: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
  },
  resendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.primary.red,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 16, 14, 0.05)',
  },
  noticeText: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.text.primary40,
  },
});
