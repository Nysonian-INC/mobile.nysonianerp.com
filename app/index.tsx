import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { palette } from '@/theme';

/** Entry route: send to the dashboard if signed in, otherwise to login. */
export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: palette.ink }} />;
  return <Redirect href={isAuthenticated ? '/dashboard' : '/login'} />;
}
