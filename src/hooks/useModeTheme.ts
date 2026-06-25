import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { MODE_THEMES, MODE_TYPOGRAPHY } from '@/constants/modeThemes';
import type { ModeColors, ModeTypography } from '@/constants/modeThemes';
import type { UserMode } from '@/store/slices/userModeSlice';

export interface ModeTheme {
  colors:     ModeColors;
  typography: ModeTypography;
  mode:       UserMode;
  scheme:     'light' | 'dark';
}

export function useModeTheme(): ModeTheme {
  const mode   = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  const scheme = useSelector((s: RootState) => s.settings?.colorScheme ?? 'light');

  const colors     = MODE_THEMES[mode][scheme];
  const typography = MODE_TYPOGRAPHY[mode];

  return { colors, typography, mode, scheme };
}
