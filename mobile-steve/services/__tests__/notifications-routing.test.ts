jest.mock('expo-notifications', () => ({}));
jest.mock('expo-device', () => ({ isDevice: false }));
jest.mock('@/services/api', () => ({ __esModule: true, default: { post: jest.fn() } }));

import { registerForPushNotificationsAsync, routeForNotificationData } from '@/services/notifications';

describe('notifications', () => {
  it('routes a tapped notification to the matching tab', () => {
    expect(routeForNotificationData({ type: 'message' })).toBe('/(tabs)/messages');
    expect(routeForNotificationData({ type: 'nouveau_match' })).toBe('/(tabs)/discover');
    expect(routeForNotificationData({ type: 'question_harmonie' })).toBe('/(tabs)');
    expect(routeForNotificationData(undefined)).toBe('/(tabs)');
  });

  it('degrades silently when push is unsupported (simulator / web)', async () => {
    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
  });
});
