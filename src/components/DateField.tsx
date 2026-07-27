import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '@/theme';

type Props = {
  label: string;
  value: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  /** Inclusive bounds, YYYY-MM-DD. Dates outside are shown disabled. */
  minDate?: string | null;
  maxDate?: string | null;
  placeholder?: string;
  disabled?: boolean;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromYmd(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDisplay(value: string) {
  const date = fromYmd(value);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Inline month-grid calendar — no native date-picker dependency required. */
export default function DateField({ label, value, onChange, minDate, maxDate, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const seed = value ? fromYmd(value) : minDate ? fromYmd(minDate) : new Date();
  const [viewYear, setViewYear] = useState(seed.getFullYear());
  const [viewMonth, setViewMonth] = useState(seed.getMonth());

  const openPicker = () => {
    if (disabled) return;
    const base = value ? fromYmd(value) : minDate ? fromYmd(minDate) : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen((o) => !o);
  };

  const changeMonth = (delta: number) => {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const min = minDate ? fromYmd(minDate) : null;
  const max = maxDate ? fromYmd(maxDate) : null;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={openPicker}
        disabled={disabled}
      >
        <Ionicons name="calendar-outline" size={18} color={palette.textMuted} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? formatDisplay(value) : placeholder || 'Select date'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textFaint} />
      </Pressable>

      {open && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Pressable hitSlop={8} onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={palette.primary} />
            </Pressable>
            <Text style={styles.panelTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <Pressable hitSlop={8} onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={palette.primary} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`blank-${idx}`} style={styles.cell} />;
              }
              const cellDate = new Date(viewYear, viewMonth, day);
              const cellYmd = toYmd(cellDate);
              const isDisabled = (min && cellDate < min) || (max && cellDate > max);
              const isSelected = value === cellYmd;
              return (
                <Pressable
                  key={cellYmd}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  disabled={!!isDisabled}
                  onPress={() => {
                    onChange(cellYmd);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isDisabled && styles.cellTextDisabled,
                      isSelected && styles.cellTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { ...typography.small, color: palette.textMuted, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  inputDisabled: { opacity: 0.5 },
  value: { ...typography.body, color: palette.text, flex: 1 },
  placeholder: { color: palette.textFaint },
  panel: {
    marginTop: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  panelTitle: { ...typography.bodyBold, color: palette.text },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    ...typography.caption,
    color: palette.textFaint,
    textTransform: 'none',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  cellSelected: { backgroundColor: palette.primary },
  cellText: { ...typography.small, color: palette.text, fontWeight: '600' },
  cellTextDisabled: { color: palette.textFaint, opacity: 0.4 },
  cellTextSelected: { color: palette.white },
});
