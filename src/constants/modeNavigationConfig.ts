import { COLORS } from '@/constants/theme';
import type { UserMode } from '@/store/slices/userModeSlice';

export interface TabDefinition {
  name:  string;
  href:  string;
  emoji: string;
  label: string;
  color: string;
}

export const TAB_CONFIG: Record<UserMode, TabDefinition[]> = {
  adolescent: [
    { name: 'index',    href: '/',         emoji: '⚡', label: 'Inicio',   color: COLORS.gamification },
    { name: 'health',   href: '/health',   emoji: '🩺', label: 'Salud',    color: COLORS.health },
    { name: 'study',    href: '/study',    emoji: '✏',  label: 'Estudio',  color: COLORS.study },
    { name: 'home',     href: '/home',     emoji: '🏠', label: 'Casa',     color: COLORS.home },
    { name: 'relation', href: '/relation', emoji: '💬', label: 'Familia',  color: COLORS.relation },
  ],
  adult: [
    { name: 'index',    href: '/',         emoji: '📊', label: 'Dashboard', color: '#1D4ED8' },
    { name: 'health',   href: '/health',   emoji: '📈', label: 'Glucosa',   color: '#1D4ED8' },
    { name: 'study',    href: '/study',    emoji: '💉', label: 'Insulina',  color: '#1D4ED8' },
    { name: 'home',     href: '/home',     emoji: '📄', label: 'Informes',  color: '#1D4ED8' },
    { name: 'settings', href: '/settings', emoji: '⚙',       label: 'Ajustes',   color: '#6B7280' },
  ],
  parent: [
    { name: 'index',    href: '/',         emoji: '👨‍👧', label: 'Resumen', color: '#16A34A' },
    { name: 'health',   href: '/health',   emoji: '❤',       label: 'Salud',    color: '#16A34A' },
    { name: 'study',    href: '/study',    emoji: '📚',  label: 'Escuela',  color: '#7C3AED' },
    { name: 'home',     href: '/home',     emoji: '🔔',  label: 'Alertas',  color: '#EA580C' },
    { name: 'settings', href: '/settings', emoji: '⚙',        label: 'Ajustes',  color: '#6B7280' },
  ],
};

export const MODE_LABELS: Record<UserMode, string> = {
  adolescent: 'Adolescente',
  adult:      'Adulto',
  parent:     'Padre/Madre',
};

export const MODE_DESCRIPTIONS: Record<UserMode, string> = {
  adolescent: 'Gamificación, emojis y ayuda visual para gestionar la diabetes',
  adult:      'Dashboard técnico con datos, gráficos y análisis',
  parent:     'Resumen del estado de tu hijo/a con alertas',
};

export const MODE_EMOJIS: Record<UserMode, string> = {
  adolescent: '⚡',
  adult:      '📊',
  parent:     '👨‍👧',
};
