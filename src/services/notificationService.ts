import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotifCategory = 'glucose' | 'study' | 'routine';

// Notification IDs we manage (stable so we can cancel & re-schedule)
const IDS = {
  glucose: [
    'glucose-0730', 'glucose-0800', 'glucose-1230',
    'glucose-1500', 'glucose-1900', 'glucose-2200',
  ],
  study:   ['study-1600'],
  routine: ['routine-morning', 'routine-afternoon', 'routine-evening'],
};

const GLUCOSE_SCHEDULE = [
  { id: 'glucose-0730', hour:  7, minute: 30, title: '🩸 Mide tu glucosa', body: 'Al despertar — antes de desayunar. ¡Tarda 2 minutos!' },
  { id: 'glucose-0800', hour:  8, minute:  0, title: '🩸 Antes del desayuno', body: 'Revisa tu glucosa antes de comer.' },
  { id: 'glucose-1230', hour: 12, minute: 30, title: '🩸 Antes del almuerzo', body: 'No olvides medir antes de comer.' },
  { id: 'glucose-1500', hour: 15, minute:  0, title: '🩸 Merienda', body: '¿Ya mediste? Solo un momento.' },
  { id: 'glucose-1900', hour: 19, minute:  0, title: '🩸 Antes de cenar', body: 'Mide tu glucosa antes de la cena.' },
  { id: 'glucose-2200', hour: 22, minute:  0, title: '🩸 Revisión de noche', body: 'Última medición del día. ¡Ya casi terminas!' },
];

const STUDY_SCHEDULE = [
  { id: 'study-1600', hour: 16, minute: 0, title: '✏️ Hora de estudiar', body: 'Empieza tu bloque Pomodoro de 15 min. ¡Tú puedes!' },
];

const ROUTINE_SCHEDULE = [
  { id: 'routine-morning',   hour:  7, minute:  0, title: '🌅 Rutina de mañana', body: 'Empieza bien el día. Revisa tu lista de tareas.' },
  { id: 'routine-afternoon', hour: 14, minute:  0, title: '📖 Rutina de tarde',   body: '¡Buenas tardes! Revisa tus tareas pendientes.' },
  { id: 'routine-evening',   hour: 20, minute: 30, title: '🌙 Rutina de noche',   body: 'Última revisión del día. Prepara el mañana.' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function cancelByIds(ids: string[]) {
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already gone */ }
  }
}

async function scheduleDaily(
  id: string, hour: number, minute: number, title: string, body: string
) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function scheduleGlucoseNotifs(enable: boolean) {
  await cancelByIds(IDS.glucose);
  if (!enable || Platform.OS === 'web') return;
  for (const n of GLUCOSE_SCHEDULE) {
    await scheduleDaily(n.id, n.hour, n.minute, n.title, n.body);
  }
}

export async function scheduleStudyNotifs(enable: boolean) {
  await cancelByIds(IDS.study);
  if (!enable || Platform.OS === 'web') return;
  for (const n of STUDY_SCHEDULE) {
    await scheduleDaily(n.id, n.hour, n.minute, n.title, n.body);
  }
}

export async function scheduleRoutineNotifs(enable: boolean) {
  await cancelByIds(IDS.routine);
  if (!enable || Platform.OS === 'web') return;
  for (const n of ROUTINE_SCHEDULE) {
    await scheduleDaily(n.id, n.hour, n.minute, n.title, n.body);
  }
}

export async function setupAllNotifications(opts: {
  glucose: boolean;
  study: boolean;
  routine: boolean;
}) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await Promise.all([
    scheduleGlucoseNotifs(opts.glucose),
    scheduleStudyNotifs(opts.study),
    scheduleRoutineNotifs(opts.routine),
  ]);
  return true;
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
