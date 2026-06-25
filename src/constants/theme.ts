import { Platform } from 'react-native';

export const COLORS = {
  // Estado semántico
  green:  '#10B981', // éxito — emerald
  yellow: '#F59E0B', // pendiente — amber
  red:    '#EF4444', // urgente — red-500
  blue:   '#3B82F6', // info
  gray:   '#94A3B8', // deshabilitado — slate-400

  // Módulos (palette cohesiva)
  health:       '#059669', // emerald-600
  study:        '#4F46E5', // indigo-600
  home:         '#D97706', // amber-600
  relation:     '#DB2777', // pink-600
  gamification: '#7C3AED', // violet-600

  // Fondos
  bg:        '#F1F5F9', // slate-100
  white:     '#FFFFFF',
  lightGray: '#F1F5F9', // alias para compatibilidad
  border:    '#E2E8F0', // slate-200
  surface:   '#F8FAFC', // slate-50

  // Texto
  dark:          '#1E293B', // slate-800
  darkSecondary: '#64748B', // slate-500
  darkTertiary:  '#94A3B8', // slate-400
};

export const TYPOGRAPHY = {
  sizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 16,
    small: 14,
    caption: 12,
  },
  weights: {
    bold:     '700' as const,
    semibold: '600' as const,
    medium:   '500' as const,
    regular:  '400' as const,
  },
  lineHeights: {
    h1: 1.2,
    h2: 1.3,
    h3: 1.4,
    body: 1.6,
    small: 1.5,
    caption: 1.4,
  },
  letterSpacing: {
    body:  0.3,
    small: 0.2,
  },
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 56,
};

export const BORDER_RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const FONT_FAMILY = {
  primary:  'OpenDyslexic',
  fallback: 'System',
};

// Compatibilidad con template Expo
export const BottomTabInset  = 0;
export const MaxContentWidth = 960;
export const Spacing = {
  half: 2, one: 4, two: 8, three: 12, four: 16,
  five: 24, six: 32, seven: 40, eight: 48,
};
export const Fonts = {
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
};
export type ThemeColor = 'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'tint' | 'textSecondary';

export const Colors = {
  light: {
    text:               COLORS.dark,
    background:         COLORS.white,
    backgroundElement:  COLORS.bg,
    backgroundSelected: '#EEF2FF',
    tint:               COLORS.study,
    textSecondary:      COLORS.darkSecondary,
  },
  dark: {
    text:               COLORS.white,
    background:         '#0F172A',
    backgroundElement:  '#1E293B',
    backgroundSelected: '#312E81',
    tint:               COLORS.study,
    textSecondary:      COLORS.darkTertiary,
  },
};
