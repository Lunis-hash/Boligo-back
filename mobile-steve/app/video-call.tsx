import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Colors, Typography, Spacing } from '@/constants/theme';
import {
  PhoneOff,
  Clock,
  AlertTriangle,
  Heart,
  MessageCircle,
  ChevronRight,
  User,
  Video,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoService } from '@/services/video';
import { Camera } from 'expo-camera';

const WARNING_SEC = 30;

// Pas de WebView sur le web : l'appel n'y est pas possible, et l'écran ne doit
// alors appeler ni /video/call-token ni /video/end (sinon le parcours pourrait
// avancer sans appel réel).
const IS_WEB = Platform.OS === 'web';
const WEB_UNAVAILABLE_MESSAGE = "L'appel vidéo est disponible dans l'application mobile BOLIGO.";

type CallState =
  | 'loading'
  | 'error'
  | 'connecting'
  | 'active'
  | 'warning'
  | 'ended';

export default function VideoCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { journeyId = '', name = 'Utilisateur' } = useLocalSearchParams<{
    journeyId: string;
    name: string;
  }>();

  const [callState, setCallState] = useState<CallState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState(name);
  const [maxDurationSec, setMaxDurationSec] = useState(420);
  const [timeLeft, setTimeLeft] = useState(420);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const endingRef = useRef(false);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const elapsed = maxDurationSec - timeLeft;

  const safeGoBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/discover');
  }, [router]);

  const finishCall = useCallback(
    async (goEnded = true) => {
      if (endingRef.current) return;
      endingRef.current = true;

      if (!IS_WEB && journeyId && hasJoinedRoom) {
        try {
          await VideoService.end(
            journeyId,
            Math.max(1, maxDurationSec - timeLeft),
          );
        } catch (e) {
          console.error('❌ [Video] end failed:', e);
        }
      }

      if (goEnded) {
        setCallState('ended');
      } else {
        if (router.canGoBack()) router.back(); else router.replace('/(tabs)/discover');
      }
    },
    [journeyId, hasJoinedRoom, maxDurationSec, timeLeft, router],
  );

  useEffect(() => {
    // Sur le web, aucun appel serveur : l'écran affiche simplement un message.
    if (IS_WEB) return;

    let cancelled = false;

    (async () => {
      if (!journeyId) {
        setErrorMessage('Parcours introuvable.');
        setCallState('error');
        return;
      }

      try {
        const cameraPerm = await Camera.requestCameraPermissionsAsync();
        const microPerm = await Camera.requestMicrophonePermissionsAsync();

        if (cameraPerm.status !== 'granted' || microPerm.status !== 'granted') {
          setErrorMessage(
            "L'accès à l'appareil photo et au micro est indispensable pour démarrer l'appel vidéo.",
          );
          setCallState('error');
          return;
        }

        const session = await VideoService.getSession(journeyId);
        if (cancelled) return;

        if (!session.dailyConfigured) {
          setErrorMessage(
            "Les appels vidéo ne sont pas encore activés sur le serveur. Ajoutez DAILY_API_KEY dans le backend.",
          );
          setCallState('error');
          return;
        }

        if (!session.canJoin) {
          setErrorMessage(
            session.currentStep === 'chat_libre'
              ? "L'appel vidéo n'est pas encore débloqué côté serveur. Redémarrez le backend avec VIDEO_TEST_UNLOCK=true (ou attendez la fin des 3 jours de chat)."
              : "Cette étape n'est pas encore disponible. Terminez le parcours Harmonie jusqu'à la phase vidéo.",
          );
          setCallState('error');
          return;
        }

        setPartnerName(session.partnerName || name);
        setMaxDurationSec(session.maxDurationSec);
        setTimeLeft(session.maxDurationSec);
        setCallState('connecting');

        const join = await VideoService.join(journeyId);
        if (cancelled) return;

        setMeetingUrl(join.meetingUrl);
        setPartnerName(join.partnerName || name);
        setMaxDurationSec(join.maxDurationSec);
        setTimeLeft(join.maxDurationSec);
        setHasJoinedRoom(true);
        setCallState('active');
      } catch (e: any) {
        if (cancelled) return;
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Impossible de démarrer l'appel vidéo.";
        setErrorMessage(Array.isArray(msg) ? msg.join(', ') : String(msg));
        setCallState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [journeyId, name]);

  useEffect(() => {
    if (callState !== 'active' && callState !== 'warning') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (timeLeft === WARNING_SEC && callState === 'active') {
      setCallState('warning');
    }
    if (timeLeft === 0 && (callState === 'active' || callState === 'warning')) {
      finishCall(true);
    }
  }, [timeLeft, callState, finishCall]);

  useEffect(() => {
    if (callState === 'ended') {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [callState, fadeAnim, slideUp]);

  if (IS_WEB) {
    return (
      <View style={styles.centered} testID="video-call-web-unavailable">
        <LinearGradient colors={['#1a1a2e', '#0f3460']} style={StyleSheet.absoluteFillObject} />
        <Video size={48} color={Colors.primary.orange} />
        <Text style={styles.errorTitle}>Appel indisponible sur le web</Text>
        <Text style={styles.errorSub}>{WEB_UNAVAILABLE_MESSAGE}</Text>
        <TouchableOpacity onPress={safeGoBack} style={styles.backLink} accessibilityRole="button">
          <Text style={styles.backLinkText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (callState === 'loading' || callState === 'connecting') {
    return (
      <View style={styles.centered}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={Colors.primary.red} />
        <Text style={styles.loadingTitle}>
          {callState === 'loading' ? 'Préparation de l\'appel…' : 'Connexion à la salle…'}
        </Text>
        <Text style={styles.loadingSub}>avec {partnerName}</Text>
      </View>
    );
  }

  if (errorMessage && callState === 'error') {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#1a1a2e', '#0f3460']} style={StyleSheet.absoluteFillObject} />
        <Video size={48} color={Colors.primary.orange} />
        <Text style={styles.errorTitle}>Appel indisponible</Text>
        <Text style={styles.errorSub}>{errorMessage}</Text>
        <TouchableOpacity onPress={safeGoBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (callState === 'ended') {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient colors={['#1a1a2e', '#0f3460']} style={StyleSheet.absoluteFillObject} />
        <Animated.View
          style={[styles.endedContent, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}
        >
          <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.endedIcon}>
            <Heart size={36} color={Colors.neutral.white} />
          </LinearGradient>
          <Text style={styles.endedTitle}>Appel terminé !</Text>
          <Text style={styles.endedSub}>Votre appel avec {partnerName} est terminé</Text>

          <View style={styles.endedDurationCard}>
            <Clock size={20} color={Colors.primary.orange} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.endedDurLabel}>Durée</Text>
              <Text style={styles.endedDurValue}>{fmt(elapsed)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.endedBtn}
            onPress={() => router.replace('/(tabs)/messages')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} style={styles.endedBtnGrad}>
              <MessageCircle size={20} color="#fff" />
              <Text style={styles.endedBtnText}>Échanger vos contacts</Text>
              <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      {meetingUrl ? (
        <WebView
          source={{ uri: meetingUrl }}
          style={styles.webview}
          originWhitelist={['https://*', 'http://*']}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          {...(Platform.OS === 'ios'
            ? { mediaCapturePermissionGrantType: 'grant' as const }
            : {})}
          onPermissionRequest={(event: any) => {
            event.grant(event.resources);
          }}
          renderLoading={() => (
            <View style={styles.webviewLoader}>
              <ActivityIndicator color={Colors.primary.red} size="large" />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ [Video WebView]', nativeEvent);
            Alert.alert(
              'Erreur vidéo',
              'Impossible de charger la salle Daily. Vérifiez connexion, caméra/micro et DAILY_API_KEY sur le serveur.',
            );
          }}
          onHttpError={(syntheticEvent) => {
            console.error('❌ [Video HTTP]', syntheticEvent.nativeEvent.statusCode);
          }}
        />
      ) : (
        <View style={styles.centered}>
          <User size={64} color="rgba(255,255,255,0.4)" />
        </View>
      )}

      <View style={[styles.timerBar, { top: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.timerPill}>
          <Clock size={13} color="#fff" />
          <Text style={styles.timerPillText}>{fmt(timeLeft)}</Text>
        </View>
      </View>

      {callState === 'warning' && (
        <View style={[styles.warningBar, { top: insets.top + 56 }]} pointerEvents="none">
          <AlertTriangle size={16} color={Colors.primary.orange} />
          <Text style={styles.warningBarText}>
            Plus que {timeLeft}s — concluez votre échange.
          </Text>
        </View>
      )}

      <View style={styles.hangupBar}>
        <TouchableOpacity
          onPress={() => finishCall(true)}
          activeOpacity={0.85}
          style={styles.hangupBtn}
        >
          <LinearGradient colors={['#FF3B30', '#E2679A']} style={styles.hangupGrad}>
            <PhoneOff size={28} color="#fff" />
          </LinearGradient>
          <Text style={styles.hangupLabel}>Raccrocher</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#0f0f1a' },
  webview: { flex: 1, backgroundColor: '#000' },
  webviewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 18,
    color: '#fff',
    marginTop: Spacing.lg,
  },
  loadingSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  errorTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: '#fff',
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  errorSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  backLink: { marginTop: 24, padding: 12 },
  backLinkText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 16,
    color: Colors.primary.orange,
  },
  timerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerPillText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#fff',
  },
  warningBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,159,67,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  warningBarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 13,
    color: Colors.primary.orange,
    flex: 1,
  },
  hangupBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hangupBtn: { alignItems: 'center', gap: 8 },
  hangupGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangupLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  endedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  endedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  endedTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 28,
    color: '#fff',
    marginBottom: 8,
  },
  endedSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 30,
  },
  endedDurationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    marginBottom: 24,
  },
  endedDurLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  endedDurValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: Colors.primary.orange,
  },
  endedBtn: { borderRadius: 30, overflow: 'hidden', width: '100%' },
  endedBtnGrad: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  endedBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#fff',
  },
});
