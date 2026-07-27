import { Ionicons } from '@expo/vector-icons';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { initialsFromName } from '@/components/InitialsAvatar';
import { palette, radius, spacing, typography } from '@/theme';
import { OrganogramNode } from '@/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  node: OrganogramNode;
  depth: number;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isLast?: boolean;
};

/**
 * One person row in the mobile organogram.
 * Large touch target, depth rail, leader chevron — the tree is the hero.
 */
export default function OrgNodeRow({
  node,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
  isLast = false,
}: Props) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isMe = !!node.is_me;
  const isVirtual = !!node.virtual;
  const padLeft = Math.min(depth, 5) * spacing.xl;

  const onPressExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={[styles.wrap, { paddingLeft: padLeft }]}>
      {depth > 0 ? (
        <View style={[styles.rail, isLast && styles.railLast]} pointerEvents="none">
          <View style={styles.railElbow} />
        </View>
      ) : null}

      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          styles.row,
          selected && styles.rowSelected,
          isMe && styles.rowMe,
          pressed && { opacity: 0.85 },
        ]}
      >
        <View
          style={[
            styles.avatar,
            isVirtual && styles.avatarVirtual,
            isMe && styles.avatarMe,
            selected && !isMe && styles.avatarSelected,
          ]}
        >
          <Text style={[styles.avatarText, isVirtual && styles.avatarTextVirtual]}>
            {isVirtual ? 'N' : initialsFromName(node.name)}
          </Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {node.name}
            </Text>
            {isMe ? (
              <View style={styles.youPill}>
                <Text style={styles.youText}>You</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {node.title || 'Employee'}
          </Text>
        </View>

        {node.direct_reports > 0 ? (
          <View style={styles.reports}>
            <Text style={styles.reportsNum}>{node.direct_reports}</Text>
          </View>
        ) : null}

        {hasChildren ? (
          <Pressable
            onPress={onPressExpand}
            hitSlop={10}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse reports' : 'Expand reports'}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={palette.textMuted}
            />
          </Pressable>
        ) : (
          <View style={styles.chevronSpacer} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  rail: {
    position: 'absolute',
    left: 8,
    top: -spacing.sm,
    bottom: '50%',
    width: 14,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: palette.borderStrong,
    borderBottomLeftRadius: 8,
  },
  railLast: {},
  railElbow: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  rowSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
  },
  rowMe: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.inkSoft,
  },
  avatarVirtual: {
    backgroundColor: palette.ink,
  },
  avatarMe: {
    backgroundColor: palette.primary,
  },
  avatarSelected: {
    backgroundColor: palette.primaryDark,
  },
  avatarText: {
    ...typography.small,
    color: palette.white,
    fontFamily: 'Manrope_700Bold',
  },
  avatarTextVirtual: {
    color: palette.onInkMuted,
  },
  meta: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...typography.bodyBold, color: palette.text, flexShrink: 1 },
  title: { ...typography.caption, color: palette.textMuted, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  youPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  youText: {
    ...typography.caption,
    color: palette.white,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  reports: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  reportsNum: {
    ...typography.caption,
    color: palette.textMuted,
    fontVariant: ['tabular-nums'],
  },
  chevronBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: palette.surfaceAlt,
  },
  chevronSpacer: { width: 32 },
});
