/**
 * Design system tokens for the Nysonian ERP mobile app.
 *
 * Direction: "Quiet Authority" — a single deep-ink navy surface, one electric
 * indigo accent, the Manrope typeface, oversized tabular numerals as the hero
 * of each screen, hairline cards and bold whitespace. Restraint over
 * decoration: every effect must earn its place.
 *
 * Single source of truth for color, spacing, radii, typography and elevation.
 * Components read from here instead of hard-coding values so the look stays
 * consistent and is trivial to retheme.
 */

import { TextStyle } from 'react-native';

export const palette = {
  // Brand — ONE disciplined electric accent (no second "AI purple" hue).
  primary: '#4F6BFF',
  primaryDark: '#3A52E0',
  primaryLight: '#ECEFFF',
  primaryGradient: ['#5A74FF', '#3A52E0'] as const,

  // Deep ink surfaces — a single-hue navy ramp used for headers / hero areas.
  ink: '#0A0E27',
  inkSoft: '#141B3D',
  inkGradient: ['#0A0E27', '#1A2350'] as const,

  // Status: solid color for icons/accents, *Dark for accessible text on the
  // matching *Light chip background (all *Dark-on-*Light pairs pass WCAG AA).
  success: '#12B76A',
  successDark: '#067647',
  successLight: '#E6F7EF',
  warning: '#F79009',
  warningDark: '#B54708',
  warningLight: '#FEF1E0',
  danger: '#F0444B',
  dangerDark: '#C01933',
  dangerLight: '#FDEBED',
  info: '#0BA5C7',
  infoDark: '#0E6E86',
  infoLight: '#E3F6FB',

  // Neutrals — contrast-checked against white.
  text: '#11162B', // ~15:1
  textMuted: '#586079', // ~5.6:1
  textFaint: '#60606E', // ~5.2:1 — headroom above AA minimum
  border: '#E9ECF3',
  borderStrong: '#DBDFEA',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FB',
  background: '#F3F5FA',

  white: '#FFFFFF',
  black: '#000000',

  // On-ink helpers (text/elements layered over the dark header).
  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255,255,255,0.66)',
  onInkFaint: 'rgba(255,255,255,0.40)',
  onInkSurface: 'rgba(255,255,255,0.10)',
  onInkBorder: 'rgba(255,255,255,0.16)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40, // breathing room between major sections
  xxxl: 48,
  huge: 64,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

/** Manrope weight families (loaded in app/_layout.tsx). */
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

// Element type RN expects for the tabular-numerals feature.
const tnum = ['tabular-nums'] as TextStyle['fontVariant'];

export const typography = {
  // Hero numerals / big balances — the one thing per screen that dominates.
  hero: { fontFamily: fonts.extrabold, fontSize: 46, fontWeight: '800' as const, letterSpacing: -1.4, fontVariant: tnum },
  display: { fontFamily: fonts.extrabold, fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.9, fontVariant: tnum },
  h1: { fontFamily: fonts.extrabold, fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.bold, fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bold, fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.1 },
  bodyBold: { fontFamily: fonts.semibold, fontSize: 15, fontWeight: '600' as const },
  body: { fontFamily: fonts.regular, fontSize: 15, fontWeight: '400' as const },
  small: { fontFamily: fonts.medium, fontSize: 13, fontWeight: '500' as const },
  caption: { fontFamily: fonts.semibold, fontSize: 11.5, fontWeight: '600' as const, letterSpacing: 0.3 },
  // All-caps eyebrow label used sparingly above hero numbers.
  overline: { fontFamily: fonts.bold, fontSize: 12, fontWeight: '700' as const, letterSpacing: 1.4, textTransform: 'uppercase' as const },
};

/** Mix into numeric Text to keep figures aligned. */
export const numeric = { fontVariant: tnum };

export const shadow = {
  // Near-flat: cards lean on a hairline border, not a heavy drop shadow.
  card: {
    shadowColor: '#0A0E27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0A0E27',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
    elevation: 6,
  },
  // The single permitted colored glow — reserved for the primary CTA only.
  floating: {
    shadowColor: '#3A52E0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 10,
  },
};

export const theme = { palette, spacing, radius, typography, numeric, fonts, shadow };
export type Theme = typeof theme;
