import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { Mic, Send, Video, MoreVertical, ChevronLeft, Lock, Sparkles, Shield, Heart, Phone, Mail, UserCheck } from 'lucide-react-native';
import client from '@/services/api';
import cacheService from '@/services/cacheService';
import soundService from '@/services/soundService';
import { moderateOutgoingMessage, maskProfanityForDisplay } from '@/services/chatModeration';
import {
  connectChatSocket,
  joinJourneyRoom,
  leaveJourneyRoom,
  markJourneyAsRead,
  SOCKET_EVENTS,
  type ChatSocketMessage,
} from '@/services/chatSocket';
import { getReadableError } from '@/services/api';

/** Débloque l’appel vidéo en phase chat pour les tests (à désactiver en prod). */
const VIDEO_TEST_UNLOCK = __DEV__;

// ─── Types ────────────────────────────────────────────────────────
type Phase = 'harmonie' | 'chat' | 'video' | 'contacts';

interface HarmonieQuestion {
  day: number;
  theme: string;
  question: string;
  myAnswer?: string;
  otherAnswer?: string;
  status: 'answered' | 'pending' | 'locked';
}

interface Message {
  id: string;
  text: string;
  senderId: 'me' | 'other';
  timestamp: string;
  isRead: boolean;
  /** En attente de confirmation serveur — affiché grisé */
  status?: 'sending' | 'sent' | 'failed';
}

interface Match {
  id: string;
  name: string;
  avatarLetter: string;
  phase: Phase;
  harmonyScore: number;
  whyMatch: string;
  phaseDay: number;
  totalDays: number;
  timeRemaining?: string;
  lastActivity: string;
  isOnline?: boolean;
  journeyId: string | null;
  harmonieQuestions?: HarmonieQuestion[];
  messages?: Message[];
  videoEnabled?: boolean;
  testUnlock?: boolean;
  contactsExchanged?: boolean;
}

// ─── Données réelles via API ───────────────────────────────────────
// Les matchs sont chargés depuis /matching/my-matches
// Les messages sont chargés depuis /journey/:id/messages

function formatMsgTime(sentAt: string | Date): string {
  const d = new Date(sentAt);
  return d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0');
}

function mapApiMessageToUi(msg: ChatSocketMessage | Record<string, unknown>, userId: string | null): Message {
  const m = msg as ChatSocketMessage;
  return {
    id: m.id,
    text: maskProfanityForDisplay(m.content ?? ''),
    senderId: m.sender?.id === userId ? 'me' : 'other',
    timestamp: formatMsgTime(m.sentAt),
    isRead: Boolean(m.isRead ?? true),
    status: 'sent',
  };
}

function mapApiMessagesToUi(apiMsgs: any[], userId: string | null): Message[] {
  return (apiMsgs || []).map((msg) => mapApiMessageToUi(msg, userId));
}

function canUseVideoCall(phase: Phase): boolean {
  return phase === 'video' || (VIDEO_TEST_UNLOCK && phase === 'chat');
}

function messagesChanged(prev: Message[], next: Message[]): boolean {
  if (prev.length !== next.length) return true;
  return prev.some((p, i) => p.id !== next[i]?.id || p.text !== next[i]?.text);
}

// Mapper les données API vers l'interface Match
function mapApiMatchToMatch(apiMatch: any, userId: string): Match {
  // Calculer le jour du chat depuis la date de début du journey
  const now = Date.now();
  // On ne peut pas calculer précisément sans stepStartDate, donc on utilise un default
  const phaseDay = apiMatch.phase === 'chat' ? 1 : apiMatch.phase === 'video' ? 1 : 1;

  return {
    id: apiMatch.id,
    name: apiMatch.name || 'Utilisateur',
    avatarLetter: (apiMatch.name || 'U').charAt(0).toUpperCase(),
    phase: apiMatch.phase === 'sondeur' ? 'harmonie' : apiMatch.phase === 'contacts' ? 'contacts' : apiMatch.phase,
    harmonyScore: apiMatch.compatibility || (79 + (String(apiMatch.id || '').charCodeAt(0) % 17)),
    whyMatch: apiMatch.slogan || 'Compatibilité basée sur vos valeurs communes.',
    phaseDay,
    totalDays: 3,
    lastActivity: 'Récemment',
    isOnline: false,
    journeyId: apiMatch.journeyId || null,
    videoEnabled: apiMatch.videoEnabled,
    testUnlock: apiMatch.testUnlock,
    contactsExchanged: apiMatch.contactsExchanged,
  };
}

// ─── Couleurs par phase ───────────────────────────────────────────
const PHASE_CONFIG = {
  harmonie: {
    color: Colors.primary.purple,
    label: 'Phase Harmonie',
    gradColors: [Colors.primary.purple, Colors.primary.red] as [string, string],
  },
  chat: {
    color: Colors.primary.red,
    label: 'Chat libre',
    gradColors: [Colors.primary.red, Colors.primary.orange] as [string, string],
  },
  video: {
    color: Colors.primary.orange,
    label: 'Appel vidéo',
    gradColors: [Colors.primary.orange, Colors.primary.purple] as [string, string],
  },
  contacts: {
    color: Colors.primary.purple,
    label: 'Échange contacts',
    gradColors: [Colors.primary.purple, Colors.primary.red] as [string, string],
  },
};

// ─── Sous-composants ──────────────────────────────────────────────

function Avatar({ letter, gradColors, size = 54 }: { letter: string; gradColors: [string, string]; size?: number }) {
  return (
    <LinearGradient
      colors={gradColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: size * 0.38, fontFamily: Typography.fontFamily.bold, color: Colors.neutral.white }}>
        {letter}
      </Text>
    </LinearGradient>
  );
}

function GradientText({ text, style }: { text: string; style?: object }) {
  // Note: vrai dégradé texte nécessite MaskedView — ici on utilise la couleur principale
  return <Text style={[{ color: Colors.primary.purple }, style]}>{text}</Text>;
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const cfg = PHASE_CONFIG[phase];
  return (
    <View style={[styles.phaseBadge, { backgroundColor: cfg.color + '18' }]}>
      <Text style={[styles.phaseBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Vue : Liste des conversations ───────────────────────────────
function ListView({ matches, onSelect }: { matches: Match[]; onSelect: (m: Match) => void }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'harmonie' | 'chat'>('all');

  const filtered = matches.filter(m => {
    if (activeTab === 'harmonie') return m.phase === 'harmonie';
    if (activeTab === 'chat') return m.phase === 'chat' || m.phase === 'video';
    return true;
  });

  return (
    <View style={styles.listContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />

      {/* Header */}
      <View style={[styles.listHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.listTitle}>Messages</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {([['all', 'Tous'], ['harmonie', 'Phase Harmonie'], ['chat', 'Chat libre']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            activeOpacity={0.7}
          >
            {activeTab === key ? (
              <LinearGradient colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabGrad}>
                <Text style={[styles.tabText, styles.tabTextActive]}>{label}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabText}>{label}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Parcours actifs — cards horizontales */}
      <Text style={styles.sectionLabel}>Vos parcours actifs</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll} contentContainerStyle={styles.cardsContent}>
        {matches.map(m => {
          const cfg = PHASE_CONFIG[m.phase];
          return (
            <TouchableOpacity key={m.id} onPress={() => onSelect(m)} activeOpacity={0.8} style={[styles.matchCard, { borderColor: cfg.color + '40' }]}>
              <Avatar letter={m.avatarLetter} gradColors={cfg.gradColors} size={52} />
              <Text style={styles.matchCardName}>{m.name}</Text>
              <PhaseBadge phase={m.phase} />
              <Text style={styles.matchCardScore}>{m.harmonyScore}% harmonie</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Liste conversations */}
      <Text style={styles.sectionLabel}>Historique</Text>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const cfg = PHASE_CONFIG[item.phase];
          const lastMsg = item.messages ? item.messages[item.messages.length - 1] : null;
          const preview = lastMsg
            ? lastMsg.text
            : item.phase === 'contacts'
              ? item.contactsExchanged
                ? '🎉 Coordonnées échangées !'
                : '✉️ Partagez vos coordonnées'
              : item.harmonieQuestions?.find(q => q.status === 'pending')
                ? 'Question du Jour ' + item.phaseDay + ' en attente…'
                : '—';
          const hasUnread = lastMsg && !lastMsg.isRead;

          return (
            <TouchableOpacity style={styles.convItem} onPress={() => onSelect(item)} activeOpacity={0.7}>
              {/* Avatar avec ring de phase */}
              <View style={[styles.convAvatarWrap, { borderColor: cfg.color + '60' }]}>
                <Avatar letter={item.avatarLetter} gradColors={cfg.gradColors} size={52} />
              </View>

              <View style={styles.convBody}>
                <View style={styles.convTop}>
                  <Text style={styles.convName}>{item.name}</Text>
                  <Text style={styles.convTime}>{item.lastActivity}</Text>
                </View>
                <View style={styles.convBottom}>
                  <Text style={[styles.convPreview, hasUnread && styles.convPreviewUnread]} numberOfLines={1}>
                    {preview}
                  </Text>
                  <View style={[styles.phaseTagSmall, { backgroundColor: cfg.color + '15' }]}>
                    <Text style={[styles.phaseTagSmallText, { color: cfg.color }]}>
                      {cfg.label} J{item.phaseDay}
                    </Text>
                  </View>
                  {hasUnread && <View style={styles.unreadDot} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.convList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Vue : Chat libre ─────────────────────────────────────────────
function ChatView({ match, onBack }: { match: Match; onBack: () => void }) {
  const router = useRouter();
  const { userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>(match.messages || []);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const cfg = PHASE_CONFIG[match.phase];
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!match.journeyId) return;
    try {
      const msgRes = await client.get(`/journey/${match.journeyId}/messages`);
      const mapped = mapApiMessagesToUi(msgRes.data, userId);
      setMessages((prev) => {
        const pending = prev.filter((m) => m.status === 'sending');
        const merged = [...mapped, ...pending.filter((p) => !mapped.some((m) => m.id === p.id))];
        return messagesChanged(prev, merged) ? merged : prev;
      });
    } catch (e) {
      console.error('❌ [Chat] Chargement messages:', e);
    }
  }, [match.journeyId, userId]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    setMessages(match.messages || []);
  }, [match.messages]);

  // Temps réel via WebSocket (plus de polling toutes les 2s)
  useEffect(() => {
    if (!match.journeyId) return;
    let cancelled = false;

    const setup = async () => {
      try {
        const socket = await connectChatSocket();
        await joinJourneyRoom(match.journeyId!);

        const onHistory = (history: ChatSocketMessage[]) => {
          if (cancelled) return;
          const mapped = mapApiMessagesToUi(history, userId);
          setMessages((prev) => {
            const pending = prev.filter((m) => m.status === 'sending');
            const merged = [...mapped, ...pending.filter((p) => !mapped.some((m) => m.id === p.id))];
            return merged;
          });
        };

        const onNew = (raw: ChatSocketMessage) => {
          if (cancelled) return;
          const incoming = mapApiMessageToUi(raw, userId);
          if (incoming.senderId !== 'me') {
            soundService.playMessageReceived();
            // La conversation est ouverte : on accuse réception immédiatement.
            if (match.journeyId) markJourneyAsRead(match.journeyId);
          }
          setMessages((prev) => {
            const withoutPending = prev.filter(
              (m) =>
                !(m.status === 'sending' && m.senderId === 'me' && m.text === incoming.text),
            );
            if (withoutPending.some((m) => m.id === incoming.id)) return withoutPending;
            return [...withoutPending, incoming];
          });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
        };

        socket.on(SOCKET_EVENTS.messageHistory, onHistory);
        socket.on(SOCKET_EVENTS.newMessage, onNew);
        await fetchMessages();
        markJourneyAsRead(match.journeyId!);

        return () => {
          socket.off(SOCKET_EVENTS.messageHistory, onHistory);
          socket.off(SOCKET_EVENTS.newMessage, onNew);
        };
      } catch (e) {
        console.error('❌ [Chat WS]', e);
        await fetchMessages();
      }
    };

    const cleanupPromise = setup();

    return () => {
      cancelled = true;
      leaveJourneyRoom(match.journeyId!);
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [match.journeyId, userId, fetchMessages]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages]),
  );

  const videoEnabled = match.videoEnabled ?? canUseVideoCall(match.phase);

  const send = async () => {
    if (!text.trim() || !match.journeyId) return;
    const msgText = text.trim();

    const mod = moderateOutgoingMessage(msgText);
    if ('reason' in mod) {
      Alert.alert('Message non envoyé', mod.reason);
      return;
    }

    const ts = formatMsgTime(new Date());
    const pendingId = `pending-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: pendingId, text: msgText, senderId: 'me', timestamp: ts, isRead: false, status: 'sending' },
    ]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await client.post('/journey/message', {
        journeyId: match.journeyId,
        content: msgText,
        type: 'texte',
      });
      const confirmed = mapApiMessageToUi(res.data, userId);
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? confirmed : m)),
      );
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('❌ [Chat] Failed to send message:', error);
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, status: 'failed' as const } : m)),
      );
      const serverMsg = error?.response?.data?.message;
      const reason = Array.isArray(serverMsg)
        ? serverMsg.join(', ')
        : serverMsg ||
          (error?.response?.status === 400
            ? 'Ce message ne respecte pas les règles BOLIGO.'
            : 'Vérifiez votre connexion et réessayez.');
      Alert.alert('Message non envoyé', reason);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.detailContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* Header */}
      <View style={styles.detHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={Colors.text.primary100} />
        </TouchableOpacity>
        <Avatar letter={match.avatarLetter} gradColors={cfg.gradColors} size={44} />
        <View style={styles.detInfo}>
          <Text style={styles.detName}>{match.name}</Text>
          <View style={styles.onlineRow}>
            {match.isOnline && <View style={styles.onlineDot} />}
            <Text style={[styles.detSub, match.isOnline ? { color: '#22C55E' } : { color: Colors.text.primary40 }]}>
              {match.isOnline ? 'En ligne · ' : ''}{cfg.label} J{match.phaseDay} / {match.totalDays}
            </Text>
          </View>
        </View>
        <View style={styles.chatHeaderActions}>
          {(match.phase === 'video' || match.phase === 'chat') ? (
            <TouchableOpacity
              style={[styles.videoBtn, !videoEnabled && styles.videoBtnLocked]}
              onPress={() => {
                if (!videoEnabled) {
                  Alert.alert('Appel vidéo verrouillé', 'L\'accès aux appels vidéo est réservé aux membres ayant terminé les 3 jours du parcours Sondeur. Poursuivez vos questions quotidiennes pour débloquer la visio !');
                  return;
                }
                router.push({ pathname: '/video-call', params: { name: match.name, avatar: match.avatarLetter, journeyId: match.journeyId || '' } })
              }}
              activeOpacity={videoEnabled ? 0.8 : 1}
            >
              <LinearGradient 
                colors={videoEnabled ? [Colors.primary.orange, Colors.primary.purple] : ['#E0E0E0', '#B0B0B0']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={styles.videoBtnGrad}
              >
                {videoEnabled ? (
                  <Video size={17} color={Colors.neutral.white} />
                ) : (
                  <Video size={17} color="#8E8E93" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
            <MoreVertical size={20} color={Colors.text.primary40} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progression Chat 3 jours */}
      <View style={styles.chatProgressContainer}>
        <View style={styles.progressTop}>
          <Text style={styles.progressTitle}>Chat libre · {match.totalDays} jours</Text>
          <Text style={styles.progressTime}>J{match.phaseDay} / {match.totalDays}</Text>
        </View>
        <View style={styles.progressDots}>
          {[1, 2, 3].map(day => (
            <LinearGradient
              key={day}
              colors={day <= match.phaseDay
                ? [Colors.primary.red, Colors.primary.orange]
                : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.progressDot}
            />
          ))}
        </View>
        {match.phase === 'chat' && !videoEnabled && (
          <View style={[styles.videoUnlockBanner, { backgroundColor: Colors.neutral.backgroundLight }]}>
            <Lock size={14} color={Colors.text.primary40} />
            <Text style={[styles.videoUnlockText, { color: Colors.text.primary70 }]}>
              Appel vidéo verrouillé — Continuez à échanger pour débloquer cette étape !
            </Text>
          </View>
        )}
        {match.phase === 'chat' && videoEnabled && (match.testUnlock ?? VIDEO_TEST_UNLOCK) && (
          <View style={[styles.videoUnlockBanner, { backgroundColor: Colors.primary.orange + '10' }]}>
            <Video size={14} color={Colors.primary.orange} />
            <Text style={[styles.videoUnlockText, { color: Colors.primary.orange }]}>
              Mode test — appel vidéo débloqué pour essayer l’appel
            </Text>
          </View>
        )}
        {match.phase === 'video' && (
          <View style={[styles.videoUnlockBanner, { backgroundColor: Colors.primary.orange + '10' }]}>
            <Video size={14} color={Colors.primary.orange} />
            <Text style={[styles.videoUnlockText, { color: Colors.primary.orange }]}>
              Appel vidéo débloqué ! Vous pouvez vous voir 🎉
            </Text>
          </View>
        )}
        <View style={styles.rulesBannerInline}>
          <Shield size={12} color={Colors.text.primary40} />
          <Text style={styles.rulesInlineText}>
            Sans contacts externes. Modération BOLIGO : grossièretés masquées à l’écran et bloquées à l’envoi (aucune copie locale hors session).
          </Text>
        </View>
      </View>

      {/* CTA Vidéo */}
      {videoEnabled && (match.phase === 'video' || ((match.testUnlock ?? VIDEO_TEST_UNLOCK) && match.phase === 'chat')) && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/video-call', params: { name: match.name, avatar: match.avatarLetter, journeyId: match.journeyId || '' } })}
          activeOpacity={0.85}
          style={styles.videoCtaHeavyWrap}
        >
          <LinearGradient
            colors={[Colors.primary.orange, Colors.primary.red]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.videoCtaHeavyGrad}
          >
            <View style={styles.videoCtaHeavyIcon}>
              <Video size={20} color={Colors.primary.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.videoCtaHeavyTitle}>Passer à l'appel vidéo ✨</Text>
              <Text style={styles.videoCtaHeavySub}>C'est le moment de vous voir !</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontFamily: Typography.fontFamily.bold }}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {match.phase === 'contacts' && (
          <ContactExchangeCard
            journeyId={match.journeyId}
            partnerName={match.name}
            onExchanged={() => { /* refresh les matches */ }}
          />
        )}
        <Text style={styles.dateSep}>Aujourd'hui</Text>
        {messages.map(msg => {
          const isPending = msg.status === 'sending';
          const isFailed = msg.status === 'failed';
          return (
          <View key={msg.id} style={[styles.bubbleWrap, msg.senderId === 'me' ? styles.bubbleWrapMe : styles.bubbleWrapOther, isPending && styles.bubbleWrapPending]}>
            {msg.senderId === 'me' ? (
              <LinearGradient
                colors={isPending || isFailed
                  ? ['#C8C8C8', '#A8A8A8', '#B8B8B8']
                  : [Colors.primary.red, Colors.primary.purple, Colors.primary.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.bubbleMe, isPending && styles.bubblePending]}
              >
                <Text style={[styles.bubbleMeText, isPending && styles.bubbleTextPending]}>{maskProfanityForDisplay(msg.text)}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.bubbleOther]}>
                <Text style={styles.bubbleOtherText}>{maskProfanityForDisplay(msg.text)}</Text>
              </View>
            )}
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>
                {isPending ? 'Envoi…' : isFailed ? 'Échec' : msg.timestamp}
              </Text>
              {msg.senderId === 'me' && !isPending && !isFailed && (
                <Text style={{ fontSize: 11, color: msg.isRead ? Colors.primary.purple : Colors.text.primary40 }}>✓✓</Text>
              )}
            </View>
          </View>
        );})}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.inputBox}
          placeholder="Votre message…"
          placeholderTextColor={Colors.text.primary40}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.micBtn} activeOpacity={0.7}>
          <Mic size={18} color={Colors.primary.red} />
        </TouchableOpacity>
        <TouchableOpacity onPress={send} activeOpacity={0.8} style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]} disabled={!text.trim()} testID="chat-send">
          <LinearGradient colors={[Colors.primary.red, Colors.primary.purple, Colors.primary.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtnGrad}>
            <Send size={16} color={Colors.neutral.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Contact Exchange Card ──────────────────────────────────────
function ContactExchangeCard({ journeyId, partnerName, onExchanged }: { journeyId: string | null; partnerName: string; onExchanged: () => void }) {
  const [exchangeState, setExchangeState] = useState<'pending' | 'accepted' | 'revealed'>('pending');
  const [partnerInfo, setPartnerInfo] = useState<{ firstName: string; telephone: string | null; email: string | null; profession: string | null; displayedCity: string | null } | null>(null);

  // Vérifier le statut au montage
  useEffect(() => {
    if (!journeyId) return;
    client.get(`/journey/${journeyId}/contact-exchange`)
      .then(res => {
        const data = res.data || {};
        if (data.myConsent && data.partnerConsent && data.bothAccepted) {
          setExchangeState('revealed');
          setPartnerInfo(data.partner ?? null);
        } else if (data.myConsent) {
          setExchangeState('accepted');
        }
      })
      .catch(() => {
        /* statut indisponible : on reste sur l'invitation à partager */
      });
  }, [journeyId]);

  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (!journeyId || accepting) return;
    setAccepting(true);
    try {
      const res = await client.post(`/journey/${journeyId}/exchange-contact`, {
        sharePhone: true,
        shareEmail: true,
      });
      const data = res.data || {};
      // Les coordonnées ne sont révélées qu'après le consentement des deux
      // membres : jamais avant (confidentialité).
      if (data.bothAccepted) {
        const statusRes = await client.get(`/journey/${journeyId}/contact-exchange`);
        setPartnerInfo((statusRes.data || {}).partner ?? null);
        setExchangeState('revealed');
        onExchanged();
      } else {
        setExchangeState('accepted');
      }
    } catch (e) {
      Alert.alert('Échange impossible', getReadableError(e));
    } finally {
      setAccepting(false);
    }
  };

  // ── En attente de ta décision ──
  if (exchangeState === 'pending') {
    return (
      <View style={styles.exchangeCard}>
        <LinearGradient
          colors={[Colors.primary.purple + '10', Colors.primary.red + '10']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.exchangeCardGrad}
        >
          <View style={styles.exchangeIconWrap}>
            <Heart size={22} color={Colors.primary.red} />
          </View>
          <Text style={styles.exchangeTitle}>Échanger vos contacts ?</Text>
          <Text style={styles.exchangeSub}>
            Votre appel vidéo s'est bien terminé. {partnerName} souhaite peut-être vous recontacter.
          </Text>
          <TouchableOpacity onPress={handleAccept} disabled={accepting} activeOpacity={0.85} style={[styles.exchangeBtnWrap, accepting && { opacity: 0.6 }]} testID="contact-exchange-accept">
            <LinearGradient colors={[Colors.primary.red, Colors.primary.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exchangeBtn}>
              <UserCheck size={18} color="#fff" />
              <Text style={styles.exchangeBtnText}>{accepting ? 'Enregistrement…' : 'Oui, partager mes contacts'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // ── Tu as accepté, en attente de l'autre ──
  if (exchangeState === 'accepted') {
    return (
      <View style={styles.exchangeCard}>
        <LinearGradient
          colors={[Colors.primary.purple + '10', Colors.primary.orange + '08']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.exchangeCardGrad}
        >
          <View style={styles.exchangeIconWrap}>
            <Sparkles size={22} color={Colors.primary.purple} />
          </View>
          <Text style={styles.exchangeTitle}>C'est presque fait !</Text>
          <Text style={styles.exchangeSub}>
            Vous avez accepté d'échanger vos contacts. Dès que {partnerName} accepte aussi, vous verrez ses coordonnées ici.
          </Text>
          <View style={styles.exchangeWaitingDots}>
            <View style={[styles.exchangeDot, { backgroundColor: Colors.primary.purple }]} />
            <View style={[styles.exchangeDot, { backgroundColor: Colors.primary.purple + '60' }]} />
            <View style={[styles.exchangeDot, { backgroundColor: Colors.primary.purple + '30' }]} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ── Les deux ont accepté → révélation des contacts ──
  return (
    <View style={styles.exchangeCard}>
      <LinearGradient
        colors={[Colors.primary.purple + '15', Colors.primary.red + '15']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.exchangeCardGrad}
      >
        <View style={styles.exchangeIconWrap}>
          <Heart size={22} color={Colors.primary.red} />
        </View>
        <Text style={styles.exchangeTitle}>Contacts échangés ! 🎉</Text>
        <Text style={styles.exchangeSub}>Vous pouvez maintenant contacter {partnerInfo?.firstName || partnerName} directement</Text>

        {partnerInfo && (
          <View style={styles.contactInfoCard}>
            {partnerInfo.telephone && (
              <TouchableOpacity
                onPress={() => partnerInfo.telephone && Linking.openURL(`tel:${partnerInfo.telephone}`)}
                activeOpacity={0.7}
                style={styles.contactInfoRow}
              >
                <View style={styles.contactInfoIcon}>
                  <Phone size={16} color={Colors.primary.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactInfoLabel}>Téléphone (cliquer pour appeler)</Text>
                  <Text style={[styles.contactInfoValue, { color: Colors.primary.purple }]}>{partnerInfo.telephone}</Text>
                </View>
              </TouchableOpacity>
            )}
            {partnerInfo.email && (
              <TouchableOpacity
                onPress={() => partnerInfo.email && Linking.openURL(`mailto:${partnerInfo.email}`)}
                activeOpacity={0.7}
                style={styles.contactInfoRow}
              >
                <View style={styles.contactInfoIcon}>
                  <Mail size={16} color={Colors.primary.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactInfoLabel}>Email (cliquer pour écrire)</Text>
                  <Text style={[styles.contactInfoValue, { color: Colors.primary.purple }]}>{partnerInfo.email}</Text>
                </View>
              </TouchableOpacity>
            )}
            {partnerInfo.profession && (
              <View style={styles.contactInfoRow}>
                <View style={styles.contactInfoIcon}>
                  <Sparkles size={16} color={Colors.primary.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactInfoLabel}>Profession</Text>
                  <Text style={styles.contactInfoValue}>{partnerInfo.profession}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const [selected, setSelected] = useState<Match | null>(null);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [realMatches, setRealMatches] = useState<Match[]>([]);

  // Garder la conversation ouverte à jour quand la liste se rafraîchit
  useEffect(() => {
    if (!selected) return;
    const updated = realMatches.find((m) => m.id === selected.id);
    if (updated) setSelected(updated);
  }, [realMatches, selected?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, []),
  );

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // 1. Vérifier l'accès aux messages avec cache
      let hasAccess = cacheService.get<boolean>('chat_access_result', 30000);
      if (hasAccess === null) {
        const accessRes = await client.get('/journey/chat-access');
        hasAccess = !!accessRes.data.canAccess;
        cacheService.set('chat_access_result', hasAccess);
      }
      setCanAccess(hasAccess);

      if (!hasAccess) {
        setLoading(false);
        return;
      }

      // 2. Charger les matchs réels
      const matchRes = await client.get('/matching/my-matches');
      const apiMatches = matchRes.data;
      console.log('💬 [Messages] Real matches loaded:', apiMatches.length);

      // 3. Mapper vers l'interface Match
      const mapped: Match[] = apiMatches.map((m: any) => mapApiMatchToMatch(m, userId || ''));

      // 4. Charger les messages pour chaque match en phase chat/video
      for (const match of mapped) {
        if (match.journeyId && (match.phase === 'chat' || match.phase === 'video')) {
          try {
            const msgRes = await client.get(`/journey/${match.journeyId}/messages`);
            const apiMsgs = msgRes.data || [];
            match.messages = mapApiMessagesToUi(apiMsgs, userId);
            match.lastActivity = apiMsgs.length > 0
              ? 'Il y a ' + Math.round((Date.now() - new Date(apiMsgs[apiMsgs.length - 1].sentAt).getTime()) / 60000) + ' min'
              : 'Aucun message';
          } catch (e) {
            console.log('💬 [Messages] No messages for journey', match.journeyId);
            match.messages = [];
          }
        }
      }

      setRealMatches(mapped);
    } catch (error) {
      console.error('❌ [Messages] Load error:', error);
      setCanAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // État de chargement
  if (loading || canAccess === null) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
        <Text style={styles.loadingText}>Vérification...</Text>
      </View>
    );
  }

  // Accès refusé
  if (!canAccess) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.neutral.white} />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        {/* Écran verrouillé */}
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconCircle}>
            <Lock size={48} color={Colors.primary.red} />
          </View>
          
          <Text style={styles.lockedTitle}>Messages verrouillés</Text>
          
          <Text style={styles.lockedDescription}>
            Pour préserver la qualité des rencontres, l'accès aux messages est débloqué après avoir terminé votre premier{' '}
            <Text style={styles.boldText}>Parcours Harmonie</Text> (3 jours).
          </Text>

          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Découvrez un profil compatible</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Répondez aux questions du Parcours Harmonie</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Accédez aux messages après le Jour 3</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => router.push('/(tabs)/discover')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary.red, Colors.primary.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.discoverButtonGradient}
            >
              <Sparkles size={18} color="#fff" />
              <Text style={styles.discoverButtonText}>Découvrir des profils</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (selected) {
    return <ChatView match={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <ListView
      matches={realMatches}
      onSelect={(m) => {
        // La phase Harmonie (Sondeur) se joue dans l'onglet « Mes matchs ».
        if (m.phase === 'harmonie') {
          router.push('/(tabs)');
          return;
        }
        setSelected(m);
      }}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── LIST ──
  listContainer: { flex: 1, backgroundColor: Colors.neutral.white },
  listHeader: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listTitle: { fontSize: 28, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, letterSpacing: -0.5 },

  tabsScroll: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 8, flexDirection: 'row' },
  tab: { borderRadius: BorderRadius.full, overflow: 'hidden', backgroundColor: Colors.neutral.backgroundLight },
  tabActive: { backgroundColor: 'transparent' },
  tabGrad: { paddingHorizontal: 18, paddingVertical: 7 },
  tabText: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.text.primary40, paddingHorizontal: 18, paddingVertical: 7 },
  tabTextActive: { color: Colors.neutral.white, paddingHorizontal: 0, paddingVertical: 0 },

  sectionLabel: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary40, letterSpacing: 0.9, textTransform: 'uppercase', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },

  cardsScroll: { flexGrow: 0 },
  cardsContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 12, flexDirection: 'row' },
  matchCard: { width: 130, backgroundColor: Colors.neutral.backgroundLight, borderRadius: 18, padding: Spacing.md, alignItems: 'center', gap: 8, borderWidth: 1.5 },
  matchCardName: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  matchCardScore: { fontSize: 11, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },
  phaseBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  phaseBadgeText: { fontSize: 10, fontFamily: Typography.fontFamily.bold },

  convList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  convItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.08)' },
  convAvatarWrap: { borderRadius: 30, borderWidth: 2.5, padding: 1 },
  convBody: { flex: 1, minWidth: 0 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convName: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  convTime: { fontSize: 12, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },
  convBottom: { flexDirection: 'row', alignItems: 'center' },
  convPreview: { fontSize: 13, color: Colors.text.primary40, flex: 1, overflow: 'hidden' },
  convPreviewUnread: { color: Colors.text.primary100, fontFamily: Typography.fontFamily.medium },
  phaseTagSmall: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  phaseTagSmallText: { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary.red, marginLeft: 6 },

  // ── DETAIL COMMUN ──
  detailContainer: { flex: 1, backgroundColor: Colors.neutral.white },
  detHeader: { paddingTop: Spacing.xxl + Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.08)' },
  backBtn: { padding: 4 },
  detInfo: { flex: 1 },
  detName: { fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  detSub: { fontSize: 12, fontFamily: Typography.fontFamily.medium, marginTop: 2 },
  moreBtn: { padding: 6, backgroundColor: Colors.neutral.backgroundLight, borderRadius: 20 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  chatHeaderActions: { flexDirection: 'row', gap: 8 },
  videoBtn: { borderRadius: 20, overflow: 'hidden' },
  videoBtnGrad: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  videoBtnLocked: { opacity: 0.8 },

  // ── HARMONIE ──
  harmonieScroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  progressCard: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.md },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressTitle: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  progressTime: { fontSize: 12, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },
  progressDots: { flexDirection: 'row', gap: 8 },
  progressDot: { flex: 1, height: 5, borderRadius: 3 },

  scoreRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  scoreCard: { flex: 1, backgroundColor: Colors.neutral.backgroundLight, borderRadius: 14, padding: Spacing.md, alignItems: 'center' },
  scoreNum: { fontSize: 26, fontFamily: Typography.fontFamily.bold, color: Colors.primary.purple },
  scoreLbl: { fontSize: 11, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular, marginTop: 2, textAlign: 'center' },

  whyCard: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  whyIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  whyTitle: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, marginBottom: 4 },
  whyText: { fontSize: 13, color: Colors.text.primary70, lineHeight: 20, fontFamily: Typography.fontFamily.regular },

  revealedCard: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: 18, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: 'rgba(232,52,74,0.12)' },
  revealedDayBadge: { marginBottom: Spacing.sm },
  revealedDayText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary40, textTransform: 'uppercase', letterSpacing: 0.8 },
  revealedBlock: { gap: 8 },
  revealedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealedName: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100 },
  revealedText: { fontSize: 14, color: Colors.text.primary100, lineHeight: 22, fontStyle: 'italic', fontFamily: Typography.fontFamily.regular },
  revealedDivider: { height: 1, backgroundColor: 'rgba(124,58,237,0.08)', marginVertical: Spacing.sm },
  myRevLabel: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.primary.purple, marginBottom: 4 },
  myRevText: { fontSize: 14, color: Colors.text.primary100, lineHeight: 22, fontFamily: Typography.fontFamily.regular },

  questionCard: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: 18, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.15)' },
  qDayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, alignSelf: 'flex-start', backgroundColor: 'rgba(124,58,237,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  qDayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary.purple },
  qDayText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.primary.purple },
  qText: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary100, lineHeight: 22, marginBottom: Spacing.sm },
  qHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  qHintDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary.purple },
  qHintText: { fontSize: 12, color: Colors.text.primary40, flex: 1, fontFamily: Typography.fontFamily.regular },
  answerInput: { backgroundColor: Colors.neutral.white, borderRadius: 12, padding: Spacing.md, fontSize: 14, color: Colors.text.primary100, fontFamily: Typography.fontFamily.regular, borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.15)', minHeight: 90, textAlignVertical: 'top' },
  qFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  charCount: { fontSize: 11, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },
  sendAnswerBtn: { borderRadius: 12, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  sendAnswerText: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.neutral.white },

  waitingCard: { backgroundColor: 'rgba(124,58,237,0.05)', borderRadius: 12, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitingIcon: { fontSize: 20 },
  waitingText: { fontSize: 13, color: Colors.text.primary70, flex: 1, lineHeight: 20, fontFamily: Typography.fontFamily.regular },

  lockedCard: { backgroundColor: Colors.neutral.backgroundLight, borderRadius: 14, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.sm },
  lockedText: { fontSize: 13, color: Colors.text.primary40, flex: 1, fontFamily: Typography.fontFamily.regular },

  // ── CHAT ──
  chatProgressContainer: { marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.neutral.backgroundLight, borderRadius: 14, padding: Spacing.md },
  rulesBannerInline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  rulesInlineText: { fontSize: 11, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },
  videoCtaHeavyWrap: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: 18, overflow: 'hidden', elevation: 2, shadowColor: Colors.primary.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  videoCtaHeavyGrad: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: 15 },
  videoCtaHeavyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  videoCtaHeavyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: '#fff', marginBottom: 2 },
  videoCtaHeavySub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontFamily: Typography.fontFamily.regular },

  // Video locked (chat phase)
  videoCtaLocked: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: 18, backgroundColor: Colors.neutral.backgroundLight, borderWidth: 1, borderColor: Colors.neutral.border, gap: 15 },
  videoCtaLockedIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  videoCtaLockedTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.text.primary40, marginBottom: 2 },
  videoCtaLockedSub: { fontSize: 13, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },

  // Video unlock banner
  videoUnlockBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 10 },
  videoUnlockText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.text.primary40 },



  // Test unlock button
  testUnlockBtn: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, paddingVertical: 10, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: Colors.primary.orange + '40', backgroundColor: Colors.primary.orange + '08' },
  testUnlockText: { fontFamily: Typography.fontFamily.medium, fontSize: 13, color: Colors.primary.orange },

  // ── Contact Exchange Card ──
  exchangeCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: Colors.primary.purple, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  exchangeCardGrad: { padding: Spacing.lg + 4, alignItems: 'center' },
  exchangeIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: Colors.primary.red, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
  exchangeTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 18, color: Colors.text.primary100, marginBottom: 6, textAlign: 'center' },
  exchangeSub: { fontFamily: Typography.fontFamily.regular, fontSize: 13, color: Colors.text.secondary, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  exchangeBtnWrap: { borderRadius: 30, overflow: 'hidden', width: '100%' },
  exchangeBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 16, borderRadius: 30 },
  exchangeBtnText: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: '#fff' },
  exchangeWaitingDots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  exchangeDot: { width: 8, height: 8, borderRadius: 4 },

  // Contact info revealed
  contactInfoCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 16, gap: 12, marginTop: 8 },
  contactInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactInfoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary.purple + '10', alignItems: 'center', justifyContent: 'center' },
  contactInfoLabel: { fontFamily: Typography.fontFamily.regular, fontSize: 11, color: Colors.text.secondary },
  contactInfoValue: { fontFamily: Typography.fontFamily.bold, fontSize: 14, color: Colors.text.primary100 },

  messagesScroll: { flex: 1 },
  messagesContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 10 },
  dateSep: { textAlign: 'center', fontSize: 11, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular, marginBottom: 4 },

  bubbleWrap: { flexDirection: 'column', gap: 3 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubbleWrapOther: { alignItems: 'flex-start' },
  bubbleWrapPending: { opacity: 0.72 },
  bubblePending: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  bubbleTextPending: { color: 'rgba(255,255,255,0.92)' },
  bubble: { maxWidth: '72%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.neutral.backgroundLight, borderBottomLeftRadius: 4 },
  bubbleMeText: { fontSize: 15, color: Colors.neutral.white, fontFamily: Typography.fontFamily.regular, lineHeight: 22 },
  bubbleOtherText: { fontSize: 15, color: Colors.text.primary100, fontFamily: Typography.fontFamily.regular, lineHeight: 22 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bubbleTime: { fontSize: 11, color: Colors.text.primary40, fontFamily: Typography.fontFamily.regular },

  inputArea: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, paddingBottom: Spacing.xl, borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.08)', flexDirection: 'row', alignItems: 'flex-end', gap: 10, backgroundColor: Colors.neutral.white },
  inputBox: { flex: 1, backgroundColor: Colors.neutral.backgroundLight, borderRadius: 22, paddingVertical: 10, paddingHorizontal: Spacing.md, fontSize: 15, color: Colors.text.primary100, fontFamily: Typography.fontFamily.regular, maxHeight: 100, borderWidth: 1.5, borderColor: 'transparent' },
  micBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(232,52,74,0.1)', alignItems: 'center', justifyContent: 'center' },
  sendBtn: { borderRadius: 21, overflow: 'hidden' },
  sendBtnGrad: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  // ── LOADING & LOCKED SCREENS ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.text.primary70,
    fontFamily: Typography.fontFamily.regular,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  lockIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary.red + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  lockedTitle: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text.primary100,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  lockedDescription: {
    fontSize: 15,
    color: Colors.text.primary70,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: Spacing.xl,
  },
  boldText: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary.red,
  },
  stepsContainer: {
    width: '100%',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary100,
    fontFamily: Typography.fontFamily.regular,
  },
  discoverButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  discoverButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
  },
  discoverButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
});