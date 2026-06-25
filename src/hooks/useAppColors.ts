import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

const LIGHT = {
  green:  '#10B981',
  yellow: '#F59E0B',
  red:    '#EF4444',
  blue:   '#3B82F6',
  gray:   '#94A3B8',

  health:       '#059669',
  study:        '#4F46E5',
  home:         '#D97706',
  relation:     '#DB2777',
  gamification: '#7C3AED',

  bg:        '#F1F5F9',
  white:     '#FFFFFF',
  lightGray: '#F1F5F9',
  border:    '#E2E8F0',
  surface:   '#F8FAFC',

  dark:          '#1E293B',
  darkSecondary: '#64748B',
  darkTertiary:  '#94A3B8',

  card:        '#FFFFFF',
  cardBorder:  '#E2E8F0',
  overlay:     'rgba(15,23,42,0.6)',

  scheme:     'light' as const,
  isNormal:   false,
  cardRadius: 16,
  cardShadow: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 } as object,
};

const DARK = {
  green:  '#10B981',
  yellow: '#F59E0B',
  red:    '#EF4444',
  blue:   '#60A5FA',
  gray:   '#64748B',

  health:       '#059669',
  study:        '#6366F1',
  home:         '#F59E0B',
  relation:     '#EC4899',
  gamification: '#8B5CF6',

  bg:        '#0F172A',
  white:     '#1E293B',
  lightGray: '#1E293B',
  border:    '#334155',
  surface:   '#1E293B',

  dark:          '#F1F5F9',
  darkSecondary: '#94A3B8',
  darkTertiary:  '#64748B',

  card:       '#1E293B',
  cardBorder: '#334155',
  overlay:    'rgba(0,0,0,0.75)',

  scheme:     'dark' as const,
  isNormal:   false,
  cardRadius: 16,
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 } as object,
};

const NOTION_LIGHT = {
  bg:            '#FFFFFF',
  white:         '#FFFFFF',
  lightGray:     '#F7F7F5',
  border:        '#E9E9E7',
  surface:       '#F7F7F5',
  dark:          '#191919',
  darkSecondary: '#787774',
  darkTertiary:  '#ACABA8',
  card:          '#FFFFFF',
  cardBorder:    '#E9E9E7',
  overlay:       'rgba(0,0,0,0.4)',
  isNormal:      true,
  cardRadius:    6,
  cardShadow:    {} as object,
};

const NOTION_DARK = {
  bg:            '#191919',
  white:         '#202020',
  lightGray:     '#252525',
  border:        '#2F2F2F',
  surface:       '#252525',
  dark:          '#E9E9E7',
  darkSecondary: '#ACABA8',
  darkTertiary:  '#787774',
  card:          '#202020',
  cardBorder:    '#2F2F2F',
  overlay:       'rgba(0,0,0,0.6)',
  isNormal:      true,
  cardRadius:    6,
  cardShadow:    {} as object,
};

export function useAppColors() {
  const scheme      = useSelector((s: RootState) => s.settings?.colorScheme ?? 'light');
  const displayMode = useSelector((s: RootState) => s.settings?.displayMode ?? 'dyslexia');
  const base = scheme === 'dark' ? DARK : LIGHT;
  if (displayMode === 'normal') return { ...base, ...(scheme === 'dark' ? NOTION_DARK : NOTION_LIGHT) };
  return base;
}

export type AppColors = ReturnType<typeof useAppColors>;
