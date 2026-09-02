/**
 * MHD Košice design system — single source of truth for colour, type,
 * spacing, radii and elevation. Derived from the MOVI · Košice MHD Figma
 * handoff (00 — Design System).
 */

export const colors = {
  primary: '#2B629E',
  primaryDeep: '#1B3F68',
  primaryTint: '#EAF1F9',
  accent: '#FFD538',
  accentDeep: '#FFC721',
  accentTint: '#FFF8DC',

  text: '#16233A',
  textSecondary: '#6B7A90',
  textTertiary: '#8494A8',

  bg: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FC',
  border: '#E7EBF1',
  borderStrong: '#D9E1EC',

  success: '#1FA971',
  successTint: '#E9F8F1',
  successText: '#12805A',
  warning: '#8A6D07',
  warningTint: '#FFF8DC',
  error: '#D9534F',
  errorTint: '#FEF3F2',
  errorText: '#C0453F',

  mapLand: '#E6ECF2',
  mapLandAlt: '#DCE5EE',
  mapWater: '#BFD6EC',
  mapBuilding: '#DFE7EF',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(12,32,60,0.45)',
} as const;

/** Transport-mode accent colours (line badges, markers, filters). */
export const modeColors = {
  bus: { bg: colors.primary, fg: colors.white },
  tram: { bg: colors.accent, fg: colors.text },
  night: { bg: '#F1F4F9', fg: colors.textSecondary },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  chip: 12,
  button: 16,
  card: 20,
  sheet: 26,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 40, lineHeight: 44, letterSpacing: -1.4, fontFamily: 'Manrope_800ExtraBold' },
  screenTitle: { fontSize: 26, lineHeight: 32, letterSpacing: -0.7, fontFamily: 'Manrope_800ExtraBold' },
  sectionTitle: { fontSize: 19, lineHeight: 24, letterSpacing: -0.4, fontFamily: 'Manrope_800ExtraBold' },
  bodyStrong: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2, fontFamily: 'Manrope_800ExtraBold' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Manrope_600SemiBold' },
  caption: { fontSize: 12, lineHeight: 18, fontFamily: 'Manrope_600SemiBold' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    fontFamily: 'Manrope_800ExtraBold',
    textTransform: 'uppercase' as const,
  },
  countdown: {
    fontSize: 36,
    letterSpacing: -1.6,
    fontFamily: 'Manrope_800ExtraBold',
    fontVariant: ['tabular-nums'] as const,
  },
} as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const shadows = {
  card: {
    shadowColor: '#16233A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  float: {
    shadowColor: '#0C204A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  ticket: {
    shadowColor: '#FFC521',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 26,
    elevation: 10,
  },
} as const;

export const layout = {
  screenGutter: spacing.xl,
  tabBarHeight: 64,
} as const;

export type ThemeColor = keyof typeof colors;
