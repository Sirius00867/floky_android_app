import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  reorderSections,
  toggleSection,
  resetScreenLayout,
  type ScreenId,
  type SectionConfig,
} from '@/store/slices/layoutSlice';

export function useScreenLayout(screen: ScreenId) {
  const dispatch = useDispatch();
  const raw = useSelector((s: RootState) => s.layout?.[screen]);

  // Fallback vacío si el estado aún no está hidratado
  const sections: SectionConfig[] = raw?.sections
    ? [...raw.sections].sort((a, b) => a.order - b.order)
    : [];

  // Devuelve true si la sección es visible
  const isVisible = (id: string) =>
    sections.find(s => s.id === id)?.visible ?? true;

  // Reordena pasando el nuevo array de IDs en orden
  const reorder = (orderedIds: string[]) =>
    dispatch(reorderSections({ screen, orderedIds }));

  // Alterna visibilidad de una sección
  const toggle = (sectionId: string) =>
    dispatch(toggleSection({ screen, sectionId }));

  // Resetea la pantalla al layout por defecto
  const reset = () => dispatch(resetScreenLayout(screen));

  return { sections, isVisible, reorder, toggle, reset };
}
