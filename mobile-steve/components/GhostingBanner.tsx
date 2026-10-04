import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Hourglass } from 'lucide-react-native';
import { Brand } from '@/constants/brand';
import { GhostingView, ghostingBannerText } from '@/services/ghosting';

import { Typography } from '@/constants/theme';
/**
 * Bandeau du pacte anti-ghosting : rappelle qui attend qui et l'échéance.
 * Quand c'est à moi de répondre, propose aussi de mettre fin poliment.
 */
export function GhostingBanner({
  view,
  partnerName,
  onLeavePolitely,
  style,
}: {
  view: GhostingView | null | undefined;
  partnerName: string;
  onLeavePolitely?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const text = ghostingBannerText(view, partnerName);
  if (!text || !view) return null;
  const mine = view.waitingOn === 'me';
  return (
    <View
      style={[styles.banner, mine ? styles.mine : styles.theirs, style]}
      accessibilityRole="alert"
      testID={mine ? 'ghosting-banner-me' : 'ghosting-banner-partner'}
    >
      <View style={[styles.icon, { backgroundColor: mine ? Brand.framboise : Brand.lavande }]}>
        <Hourglass size={16} color="#FFFFFF" />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.body}>{text.body}</Text>
        {mine && onLeavePolitely ? (
          <Pressable onPress={onLeavePolitely} accessibilityRole="button" hitSlop={8} testID="ghosting-leave">
            <Text style={styles.link}>Mettre fin poliment</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  mine: { backgroundColor: Brand.rose, borderColor: '#F7C9DC' },
  theirs: { backgroundColor: Brand.lilas, borderColor: '#DCD2FA' },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Brand.encre },
  body: { fontFamily: Typography.fontFamily.regular, fontSize: 14, lineHeight: 20, color: Brand.encreDouce },
  link: { marginTop: 2, fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Brand.framboise, textDecorationLine: 'underline' },
});
