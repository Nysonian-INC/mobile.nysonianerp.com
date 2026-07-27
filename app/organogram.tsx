import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  ListRenderItem,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import Card from '@/components/Card';
import OrgEmptyArt from '@/components/organogram/OrgEmptyArt';
import OrgNodeRow from '@/components/organogram/OrgNodeRow';
import ScreenHeader from '@/components/ScreenHeader';
import SegmentedControl from '@/components/SegmentedControl';
import StateView from '@/components/StateView';
import { useReadOnlyResource } from '@/hooks/useReadOnlyResource';
import { fonts, numeric, palette, radius, spacing, typography } from '@/theme';
import { OrganogramFlatNode, OrganogramNode } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FocusMode = 'org' | 'chain' | 'team';

type FlatOrgRow = {
  node: OrganogramNode;
  depth: number;
  isLast: boolean;
};

const ROW_HEIGHT = 72;

const MODES: Array<{ key: FocusMode; label: string }> = [
  { key: 'org', label: 'Org' },
  { key: 'chain', label: 'My chain' },
  { key: 'team', label: 'My team' },
];

function findNode(root: OrganogramNode, key: string): OrganogramNode | null {
  if (root.id === key || root.employee_key === key) return root;
  for (const child of root.children ?? []) {
    const hit = findNode(child, key);
    if (hit) return hit;
  }
  return null;
}

/** Subtree containing only nodes whose ids are in `keep`. */
function filterTree(node: OrganogramNode, keep: Set<string>): OrganogramNode | null {
  if (node.virtual) {
    const kids = (node.children ?? [])
      .map((c) => filterTree(c, keep))
      .filter(Boolean) as OrganogramNode[];
    if (kids.length === 0) return null;
    return { ...node, children: kids, direct_reports: kids.length };
  }
  if (!keep.has(node.id)) return null;
  const kids = (node.children ?? [])
    .map((c) => filterTree(c, keep))
    .filter(Boolean) as OrganogramNode[];
  return { ...node, children: kids, direct_reports: kids.length };
}

function collectIds(node: OrganogramNode, into: Set<string>) {
  into.add(node.id);
  for (const c of node.children ?? []) collectIds(c, into);
}

function defaultExpanded(tree: OrganogramNode, mode: FocusMode, meKey: string, chainKeys: string[]) {
  const open = new Set<string>();
  if (mode === 'org') {
    open.add(tree.id);
    for (const c of tree.children ?? []) open.add(c.id);
  } else if (mode === 'chain') {
    chainKeys.forEach((k) => open.add(k));
    if (tree.virtual) open.add(tree.id);
  } else {
    if (meKey) open.add(meKey);
    if (tree.virtual) open.add(tree.id);
    const me = findNode(tree, meKey);
    if (me?.manager_key) open.add(me.manager_key);
  }
  return open;
}

/** Flatten only the currently expanded visible nodes for FlatList virtualization. */
function flattenVisible(
  node: OrganogramNode,
  expanded: Set<string>,
  depth = 0,
  isLast = true,
): FlatOrgRow[] {
  const rows: FlatOrgRow[] = [{ node, depth, isLast }];
  if (!expanded.has(node.id)) return rows;
  const kids = node.children ?? [];
  kids.forEach((child, i) => {
    rows.push(...flattenVisible(child, expanded, depth + 1, i === kids.length - 1));
  });
  return rows;
}

export default function OrganogramScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, refresh, retry } = useReadOnlyResource(
    () => api.getOrganogram(),
    [],
  );

  const [mode, setMode] = useState<FocusMode>('chain');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const listRef = useRef<FlatList<FlatOrgRow>>(null);
  const headerHeight = useRef(0);

  useEffect(() => {
    if (!data?.tree) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(defaultExpanded(data.tree, mode, data.meKey, data.chainKeys));
    setSelectedKey(data.meKey || data.tree.id);
  }, [data, mode]);

  const visibleTree = useMemo(() => {
    if (!data?.tree) return null;
    if (mode === 'org') return data.tree;

    if (mode === 'chain') {
      const keep = new Set(data.chainKeys);
      const me = data.meKey ? findNode(data.tree, data.meKey) : null;
      me?.children?.forEach((c) => keep.add(c.id));
      if (data.tree.virtual) keep.add(data.tree.id);
      return filterTree(data.tree, keep) ?? data.tree;
    }

    const me = data.meKey ? findNode(data.tree, data.meKey) : null;
    if (!me) return data.tree;
    const keep = new Set<string>();
    if ((me.children?.length ?? 0) > 0) {
      keep.add(me.id);
      me.children.forEach((c) => keep.add(c.id));
    } else if (me.manager_key) {
      const mgr = findNode(data.tree, me.manager_key);
      if (mgr) {
        keep.add(mgr.id);
        mgr.children.forEach((c) => keep.add(c.id));
      } else {
        keep.add(me.id);
      }
    } else {
      keep.add(me.id);
    }
    return filterTree(data.tree, keep) ?? me;
  }, [data, mode]);

  const flatRows = useMemo(
    () => (visibleTree ? flattenVisible(visibleTree, expanded) : []),
    [visibleTree, expanded],
  );

  const rowIndex = useMemo(() => {
    const map: Record<string, number> = {};
    flatRows.forEach((row, i) => {
      map[row.node.id] = i;
    });
    return map;
  }, [flatRows]);

  const selected = useMemo(() => {
    if (!data || !selectedKey) return null;
    return data.flat.find((n) => n.id === selectedKey) ?? null;
  }, [data, selectedKey]);

  const searchHits = useMemo(() => {
    if (!data || query.trim().length < 1) return [] as OrganogramFlatNode[];
    const q = query.trim().toLowerCase();
    return data.flat
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q)
          || n.title.toLowerCase().includes(q)
          || n.employee_key.toLowerCase().includes(q)
          || (n.designation || '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [data, query]);

  const toggle = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const focusPerson = useCallback(
    (key: string) => {
      if (!data) return;
      setSelectedKey(key);
      setQuery('');
      setSearchOpen(false);
      if (mode === 'org') {
        const path: string[] = [];
        let cursor: string | undefined = key;
        const seen = new Set<string>();
        while (cursor && !seen.has(cursor)) {
          seen.add(cursor);
          path.push(cursor);
          cursor = data.parents[cursor];
        }
        setExpanded((prev) => {
          const next = new Set(prev);
          path.forEach((id) => next.add(id));
          if (data.tree.virtual) next.add(data.tree.id);
          return next;
        });
      }
      requestAnimationFrame(() => {
        const idx = rowIndex[key];
        if (idx != null) {
          listRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.25,
          });
        }
      });
    },
    [data, mode, rowIndex],
  );

  const onSelectMode = useCallback((next: FocusMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(next);
  }, []);

  const renderRow: ListRenderItem<FlatOrgRow> = useCallback(
    ({ item }) => (
      <OrgNodeRow
        node={item.node}
        depth={item.depth}
        expanded={expanded.has(item.node.id)}
        selected={selectedKey === item.node.id}
        isLast={item.isLast}
        onToggle={() => toggle(item.node.id)}
        onSelect={() => focusPerson(item.node.id)}
      />
    ),
    [expanded, selectedKey, toggle, focusPerson],
  );

  const emptyOrg =
    !!data
    && (data.stats.employees === 0
      || (!!data.tree.virtual && (data.tree.children?.length ?? 0) === 0));

  const listHeader = data ? (
    <View
      style={styles.headerBlock}
      onLayout={(e) => {
        headerHeight.current = e.nativeEvent.layout.height;
      }}
    >
      {error ? (
        <Card style={styles.warn}>
          <Text style={styles.warnText}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.hero}>
        <Text style={styles.heroOverline}>Active organization</Text>
        <Text style={styles.heroNum}>{data.stats.employees}</Text>
        <Text style={styles.heroCaption}>
          {data.stats.leaders} leaders · {data.stats.levels} levels
        </Text>
      </View>

      {selected && !selected.virtual ? (
        <Card raised style={styles.focusCard}>
          <Text style={styles.focusOverline}>{selected.is_me ? 'You' : 'Selected'}</Text>
          <Text style={styles.focusName}>{selected.name}</Text>
          <Text style={styles.focusTitle}>{selected.title}</Text>
          <View style={styles.focusMeta}>
            <MetaChip icon="key-outline" label={selected.employee_key || '—'} />
            <MetaChip
              icon="people-outline"
              label={
                selected.direct_reports > 0
                  ? `${selected.direct_reports} report${selected.direct_reports === 1 ? '' : 's'}`
                  : 'Individual contributor'
              }
            />
          </View>
        </Card>
      ) : null}

      <SegmentedControl tabs={MODES} active={mode} onSelect={onSelectMode} variant="ink" />

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={palette.textFaint} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name, role, or employee key"
            placeholderTextColor={palette.textFaint}
            style={styles.searchInput}
            autoFocus
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}

      {searchOpen && searchHits.length > 0 ? (
        <Card padded={false} style={styles.hits}>
          {searchHits.map((hit, i) => (
            <Pressable
              key={hit.id}
              onPress={() => {
                if (mode !== 'org') setMode('org');
                focusPerson(hit.id);
              }}
              style={({ pressed }) => [
                styles.hitRow,
                i < searchHits.length - 1 && styles.hitDivider,
                pressed && { backgroundColor: palette.surfaceAlt },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.hitName}>{hit.name}</Text>
                <Text style={styles.hitMeta}>
                  {hit.title} · {hit.employee_key}
                </Text>
              </View>
              {hit.is_me ? <Text style={styles.hitYou}>You</Text> : null}
            </Pressable>
          ))}
        </Card>
      ) : null}

      {emptyOrg ? (
        <View style={styles.empty}>
          <OrgEmptyArt />
          <Text style={styles.emptyTitle}>No active hierarchy</Text>
          <Text style={styles.emptyText}>
            Active employees with reporting lines will appear here.
          </Text>
        </View>
      ) : visibleTree ? (
        <View style={styles.treeHeader}>
          <Text style={styles.treeLabel}>
            {mode === 'org' ? 'Full organization' : mode === 'chain' ? 'Your reporting chain' : 'Your team'}
          </Text>
          {mode === 'org' ? (
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                const all = new Set<string>();
                collectIds(visibleTree, all);
                const fullyOpen = all.size > 0 && [...all].every((id) => expanded.has(id));
                setExpanded(fullyOpen ? new Set([visibleTree.id]) : all);
              }}
              hitSlop={8}
              style={styles.treeActionHit}
            >
              <Text style={styles.treeAction}>{expanded.size > 2 ? 'Collapse' : 'Expand all'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Organogram"
        subtitle="Reporting structure"
        right={
          <View style={styles.headerActions}>
            <Pressable
              hitSlop={10}
              onPress={() => setSearchOpen((v) => !v)}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Search organization"
            >
              <Ionicons name="search" size={20} color={palette.onInk} />
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={palette.onInk} />
            </Pressable>
          </View>
        }
      />

      {loading && !data ? (
        <StateView loading />
      ) : error && !data ? (
        <View style={styles.contentPad}>
          <StateView error={error} onRetry={retry} />
        </View>
      ) : data ? (
        <FlatList
          ref={listRef}
          data={emptyOrg ? [] : flatRows}
          keyExtractor={(item) => item.node.id}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListFooterComponent={
            <Text style={styles.footer}>Same source as Organogram 3 · Active employees only</Text>
          }
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, headerHeight.current + info.index * ROW_HEIGHT - 40),
              animated: true,
            });
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} />
          }
        />
      ) : null}
    </View>
  );
}

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={palette.textMuted} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: palette.onInkSurface,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerBlock: { gap: spacing.lg, marginBottom: spacing.md },
  warn: { backgroundColor: palette.warningLight, borderColor: palette.warning },
  warnText: { ...typography.small, color: palette.warningDark },

  hero: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  heroOverline: { ...typography.overline, color: palette.textFaint },
  heroNum: {
    ...typography.hero,
    color: palette.text,
    marginTop: spacing.xs,
  },
  heroCaption: {
    ...typography.small,
    color: palette.textMuted,
    marginTop: spacing.sm,
  },

  focusCard: {
    padding: spacing.xl,
    gap: spacing.xs,
  },
  focusOverline: { ...typography.overline, color: palette.primary },
  focusName: { ...typography.h2, color: palette.text, marginTop: 2 },
  focusTitle: { ...typography.body, color: palette.textMuted },
  focusMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceAlt,
  },
  chipText: { ...typography.caption, color: palette.textMuted, textTransform: 'none', letterSpacing: 0 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: palette.text,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  hits: { overflow: 'hidden' },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  hitDivider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  hitName: { ...typography.bodyBold, color: palette.text },
  hitMeta: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0,
  },
  hitYou: { ...typography.caption, color: palette.primary },

  treeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treeLabel: { ...typography.overline, color: palette.textFaint },
  treeActionHit: { minHeight: 44, justifyContent: 'center' },
  treeAction: { ...typography.small, color: palette.primary, fontFamily: fonts.semibold },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.h3, color: palette.text },
  emptyText: {
    ...typography.small,
    color: palette.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },

  footer: {
    ...typography.caption,
    color: palette.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
    textTransform: 'none',
    letterSpacing: 0,
    ...numeric,
  },
});
