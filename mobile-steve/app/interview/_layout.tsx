import { Stack } from 'expo-router';

export default function InterviewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[moduleNumber]" />
      <Stack.Screen name="generation" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
