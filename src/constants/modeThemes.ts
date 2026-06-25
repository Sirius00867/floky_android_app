import type { UserMode } from '@/store/slices/userModeSlice';

// ── Paletas de color por modo ─────────────────────────────────────────────────

const ADOLESCENT_LIGHT = {
  bg:            '#F1F5F9',
  white:         '#FFFFFF',
  surface:       '#F8FAFC',
  border:        '#E2E8F0',
  cardBorder:    '#E2E8F0',
  dark:          '#1E293B',
  darkSecondary: '#64748B',
  darkTertiary:  '#94A3B8',
  green:         '#10B981',
  yellow:        '#F59E0B',
  red:           '#EF4444',
  blue:          '#3B82F6',
  gray:          '#94A3B8',
  health:        '#059669',
  study:         '#4F46E5',
  home:          '#D97706',
  relation:      '#DB2777',
  gamification:  '#7C3AED',
};

const ADOLESCENT_DARK = {
  bg:            '#0F172A',
  white:         '#1E293B',
  surface:       '#1E293B',
  border:        '#334155',
  cardBorder:    '#334155',
  dark:          '#F1F5F9',
  darkSecondary: '#94A3B8',
  darkTertiary:  '#64748B',
  green:         '#34D399',
  yellow:        '#FCD34D',
  red:           '#F87171',
  blue:          '#60A5FA',
  gray:          '#64748B',
  health:        '#34D399',
  study:         '#818CF8',
  home:          '#FCD34D',
  relation:      '#F472B6',
  gamification:  '#A78BFA',
};

const ADULT_LIGHT = {
  bg:            '#FAFAFA',
  white:         '#FFFFFF',
  surface:       '#FFFFFF',
  border:        '#E5E7EB',
  cardBorder:    '#E5E7EB',
  dark:          '#111827',
  darkSecondary: '#6B7280',
  darkTertiary:  '#9CA3AF',
  green:         '#059669',
  yellow:        '#D97706',
  red:           '#DC2626',
  blue:          '#1D4ED8',
  gray:          '#9CA3AF',
  health:        '#1D4ED8',
  study:         '#1D4ED8',
  home:          '#1D4ED8',
  relation:      '#1D4ED8',
  gamification:  '#1D4ED8',
};

const ADULT_DARK = {
  bg:            '#111827',
  white:         '#1F2937',
  surface:       '#1F2937',
  border:        '#374151',
  cardBorder:    '#374151',
  dark:          '#F9FAFB',
  darkSecondary: '#9CA3AF',
  darkTertiary:  '#6B7280',
  green:         '#10B981',
  yellow:        '#F59E0B',
  red:           '#EF4444',
  blue:          '#3B82F6',
  gray:          '#6B7280',
  health:        '#3B82F6',
  study:         '#3B82F6',
  home:          '#3B82F6',
  relation:      '#3B82F6',
  gamification:  '#3B82F6',
};

const PARENT_LIGHT = {
  bg:            '#F9FAFB',
  white:         '#FFFFFF',
  surface:       '#FFFFFF',
  border:        '#E5E7EB',
  cardBorder:    '#E5E7EB',
  dark:          '#1F2937',
  darkSecondary: '#6B7280',
  darkTertiary:  '#9CA3AF',
  green:         '#16A34A',
  yellow:        '#EA580C',
  red:           '#DC2626',
  blue:          '#2563EB',
  gray:          '#9CA3AF',
  health:        '#16A34A',
  study:         '#7C3AED',
  home:          '#EA580C',
  relation:      '#DB2777',
  gamification:  '#9333EA',
};

const PARENT_DARK = {
  bg:            '#111827',
  white:         '#1F2937',
  surface:       '#1F2937',
  border:        '#374151',
  cardBorder:    '#374151',
  dark:          '#F3F4F6',
  darkSecondary: '#9CA3AF',
  darkTertiary:  '#6B7280',
  green:         '#4ADE80',
  yellow:        '#FB923C',
  red:           '#F87171',
  blue:          '#60A5FA',
  gray:          '#6B7280',
  health:        '#4ADE80',
  study:         '#A78BFA',
  home:          '#FB923C',
  relation:      '#F472B6',
  gamification:  '#C084FC',
};

const MEDICAL_LIGHT = {
  bg:            '#FFFFFF',
  white:         '#FFFFFF',
  surface:       '#F9FAFB',
  border:        '#D1D5DB',
  cardBorder:    '#D1D5DB',
  dark:          '#111827',
  darkSecondary: '#374151',
  darkTertiary:  '#6B7280',
  green:         '#15803D',
  yellow:        '#B45309',
  red:           '#B91C1C',
  blue:          '#1E40AF',
  gray:          '#6B7280',
  health:        '#B91C1C',
  study:         '#1E40AF',
  home:          '#B45309',
  relation:      '#1E40AF',
  gamification:  '#1E40AF',
};

const MEDICAL_DARK = {
  bg:            '#0A0E1A',
  white:         '#111827',
  surface:       '#111827',
  border:        '#1F2937',
  cardBorder:    '#1F2937',
  dark:          '#F3F4F6',
  darkSecondary: '#D1D5DB',
  darkTertiary:  '#9CA3AF',
  green:         '#22C55E',
  yellow:        '#EAB308',
  red:           '#EF4444',
  blue:          '#60A5FA',
  gray:          '#6B7280',
  health:        '#EF4444',
  study:         '#60A5FA',
  home:          '#EAB308',
  relation:      '#60A5FA',
  gamification:  '#60A5FA',
};

export type ModeColors = typeof ADOLESCENT_LIGHT;

export const MODE_THEMES: Record<UserMode, { light: ModeColors; dark: ModeColors }> = {
  adolescent: { light: ADOLESCENT_LIGHT, dark: ADOLESCENT_DARK },
  adult:      { light: ADULT_LIGHT,      dark: ADULT_DARK },
  parent:     { light: PARENT_LIGHT,     dark: PARENT_DARK },
};

// ── Tipografía por modo ───────────────────────────────────────────────────────

export const MODE_TYPOGRAPHY = {
  adolescent: {
    sizes:         { h1: 28, h2: 22, h3: 18, body: 16, small: 14, caption: 12 },
    lineHeights:   { h1: 1.2, h2: 1.3, h3: 1.4, body: 1.6, small: 1.5, caption: 1.4 },
    letterSpacing: { body: 0.3, small: 0.2 },
  },
  adult: {
    sizes:         { h1: 24, h2: 18, h3: 16, body: 14, small: 12, caption: 11 },
    lineHeights:   { h1: 1.2, h2: 1.25, h3: 1.3, body: 1.4, small: 1.35, caption: 1.3 },
    letterSpacing: { body: 0, small: 0 },
  },
  parent: {
    sizes:         { h1: 26, h2: 20, h3: 18, body: 15, small: 13, caption: 12 },
    lineHeights:   { h1: 1.25, h2: 1.35, h3: 1.4, body: 1.5, small: 1.4, caption: 1.35 },
    letterSpacing: { body: 0.2, small: 0.1 },
  },
};

export type ModeTypography = typeof MODE_TYPOGRAPHY.adolescent;
