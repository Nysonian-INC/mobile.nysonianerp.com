import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import Card from '@/components/Card';
import InitialsAvatar from '@/components/InitialsAvatar';
import ScreenHeader from '@/components/ScreenHeader';
import StateView from '@/components/StateView';
import { useDashboard } from '@/hooks/useDashboard';
import { fonts, palette, radius, spacing, typography } from '@/theme';
import { HrEmployeeSearchResult } from '@/types';

export default function EmployeeSearchScreen() {
  const insets = useSafeAreaInsets();
  const { data: dashboard, loading: dashLoading } = useDashboard();
  const allowed = Boolean(dashboard?.permissions?.employeesList);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HrEmployeeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!dashLoading && dashboard && !allowed) {
      router.replace('/(tabs)/profile' as never);
    }
  }, [dashLoading, dashboard, allowed]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      setSearching(false);
      return;
    }
    const id = ++requestId.current;
    setSearching(true);
    setError(null);
    try {
      const res = await api.searchEmployees(trimmed, 30);
      if (id !== requestId.current) return;
      if (res.status === 'success' && res.data) {
        setResults(res.data.results);
        setSearched(true);
      } else {
        setResults([]);
        setSearched(true);
        setError(res.message || 'Search failed.');
      }
    } catch (err: any) {
      if (id !== requestId.current) return;
      setResults([]);
      setSearched(true);
      setError(err?.message || 'Network error.');
    } finally {
      if (id === requestId.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  if (dashLoading && !dashboard) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Find employees"
          subtitle="Active directory"
          right={
            <Pressable hitSlop={10} onPress={() => router.back()}>
              <Ionicons name="close" size={22} color={palette.onInk} />
            </Pressable>
          }
        />
        <StateView loading />
      </View>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Find employees"
        subtitle="Search active employees"
        right={
          <Pressable hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={palette.onInk} />
          </Pressable>
        }
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Name, E-code, email, phone…"
            placeholderTextColor={palette.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator size="small" color={palette.primary} /> : null}
        </View>
      </View>

      {error ? (
        <Card padded style={styles.warn}>
          <Text style={styles.warnText}>{error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.employeeKey || item.email || item.name}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          searched && !searching ? (
            <StateView
              empty
              emptyIcon="people-outline"
              emptyTitle="No matches"
              emptyText="Try another name, E-code, email, or phone number."
            />
          ) : query.trim().length < 2 ? (
            <StateView
              empty
              emptyIcon="search-outline"
              emptyTitle="Search employees"
              emptyText="Type at least 2 characters to find active employees you can access."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/employees/${encodeURIComponent(item.employeeKey)}` as never)}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Card padded style={styles.rowCard}>
              <InitialsAvatar name={item.name || 'Employee'} size={44} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name || 'Employee'}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[item.employeeCode, item.designation, item.department].filter(Boolean).join(' · ') || '—'}
                </Text>
                {item.email ? (
                  <Text style={styles.rowEmail} numberOfLines={1}>
                    {item.email}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    fontFamily: fonts.medium,
    paddingVertical: 4,
  },
  warn: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: palette.warningLight },
  warnText: { ...typography.small, color: palette.warningDark },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBody: { flex: 1 },
  rowName: { ...typography.bodyBold, color: palette.text },
  rowMeta: { ...typography.caption, color: palette.textMuted, marginTop: 2, textTransform: 'none' },
  rowEmail: { ...typography.caption, color: palette.textFaint, marginTop: 1, textTransform: 'none' },
});
