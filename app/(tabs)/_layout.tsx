import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/lib/confirm';
import { fonts, palette, shadow } from '@/theme';

export default function TabsLayout() {
  const { isAuthenticated, loading, logout } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: palette.ink }} />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const confirmLogout = async () => {
    const ok = await confirmAction('Log out', 'Are you sure you want to sign out?', 'Log out');
    if (!ok) return;
    await logout();
    router.replace('/login');
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textFaint,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold, marginTop: 2 },
        // Frozen footer: the tab bar is pinned to the bottom on every screen.
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          ...shadow.card,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: 'Leaves',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Logout',
          tabBarIcon: ({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={palette.danger} />
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: fonts.semibold,
            marginTop: 2,
            color: palette.danger,
          },
        }}
        listeners={{
          // Intercept the tab press: confirm + sign out instead of opening a screen.
          tabPress: (e) => {
            e.preventDefault();
            void confirmLogout();
          },
        }}
      />
    </Tabs>
  );
}
