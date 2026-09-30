import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="value-slides" />
      <Stack.Screen name="profile-details" />
      <Stack.Screen name="payment" />
    </Stack>
  );
}
