import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardProvider } from '@/context/DashboardContext';
import SessionWatcher from '@/components/SessionWatcher';
import { palette } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Never hard-block the app on the network: if fonts error out we still
  // render (the system fallback degrades gracefully).
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontError) {
      console.warn('Manrope failed to load; using system fallback.', fontError);
    }
  }, [fontError]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: palette.ink }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DashboardProvider>
            <SessionWatcher />
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="ipcam" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="biometric-machines" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="assets" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-personal-info" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-documents" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-payslips" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-notifications" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-help-support" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="organogram" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="employees/search" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="employees/[employeeKey]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="leave-request" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="leave-detail" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="leave-approvals/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="leave-approvals/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="offer-letter-approvals/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="offer-letter-approvals/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="lifecycle-approvals/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="lifecycle-approvals/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="probation-approvals/index" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="probation-approvals/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
          </DashboardProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
