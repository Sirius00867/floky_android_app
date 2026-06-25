import React from 'react';
import { useSelector } from 'react-redux';
import { AvatarCompanion, AvatarAnimationState, BloodGlucoseStatus } from '@/utils/avatarTypes';
import { useAvatarState } from '@/hooks/useAvatarState';
import type { RootState } from '@/store/store';
import { GerberaAvatar } from './adolescent/GerberaAvatar';
import { RosaAvatar } from './adolescent/RosaAvatar';
import { TulipanAvatar } from './adolescent/TulipanAvatar';
import { DinoAvatar } from './parent/DinoAvatar';
import { OsoAvatar } from './parent/OsoAvatar';
import { PatitoAvatar } from './parent/PatitoAvatar';
import { ZenGemAvatar } from './adult/ZenGemAvatar';
import { PlasmaOrbAvatar } from './adult/PlasmaOrbAvatar';
import { OrigamiAvatar } from './adult/OrigamiAvatar';

export interface AvatarProps {
  animationState: AvatarAnimationState;
  size?: number;
}

interface AvatarControllerProps {
  companion: AvatarCompanion;
  glucoseStatus?: BloodGlucoseStatus;
  size?: number;
}

const AVATAR_MAP: Record<AvatarCompanion, React.ComponentType<AvatarProps>> = {
  gerbera:    GerberaAvatar,
  rosa:       RosaAvatar,
  tulipan:    TulipanAvatar,
  dino:       DinoAvatar,
  oso:        OsoAvatar,
  pato:       PatitoAvatar,
  zen_gem:    ZenGemAvatar,
  plasma_orb: PlasmaOrbAvatar,
  origami:    OrigamiAvatar,
};

/** Versión manual: recibe el companion explícitamente */
export function AvatarController({
  companion,
  glucoseStatus = BloodGlucoseStatus.UNKNOWN,
  size = 120,
}: AvatarControllerProps) {
  const { currentState } = useAvatarState(glucoseStatus);
  const AvatarComponent = AVATAR_MAP[companion];

  if (!AvatarComponent) return null;
  return <AvatarComponent animationState={currentState} size={size} />;
}

/**
 * Versión conectada a Redux: lee el modo actual y el companion elegido
 * para ese modo automáticamente. Solo necesita glucoseStatus y size.
 */
export function ConnectedAvatarController({
  glucoseStatus = BloodGlucoseStatus.UNKNOWN,
  size = 120,
}: { glucoseStatus?: BloodGlucoseStatus; size?: number }) {
  const mode                = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  const adolescentCompanion = useSelector((s: RootState) => s.settings.adolescentCompanion ?? 'gerbera');
  const parentCompanion     = useSelector((s: RootState) => s.settings.parentCompanion     ?? 'dino');
  const adultCompanion      = useSelector((s: RootState) => s.settings.adultCompanion      ?? 'zen_gem');

  const companion: AvatarCompanion =
    mode === 'parent'     ? parentCompanion :
    mode === 'adult'      ? adultCompanion  :
    /* adolescent */        adolescentCompanion;

  return <AvatarController companion={companion} glucoseStatus={glucoseStatus} size={size} />;
}
