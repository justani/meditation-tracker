import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import MeditationTimerModule from '../../modules/meditation-timer/src/MeditationTimerModule';

export const TIMER_DURATIONS = [10, 20, 30, 40, 50, 60];
export const TIMER_CHANNEL_ID = 'meditation-timer-alarm-v3';

const TIMER_STORAGE_KEY = 'active_meditation_timer';
const TIMER_NOTIFICATION_PREFIX = 'meditation-timer-';
const LEGACY_TIMER_CHANNEL_IDS = [
  'meditation-timer-v1',
  'meditation-timer-alarm-v2',
  TIMER_CHANNEL_ID,
];
const CHECKPOINT_INTERVAL_MINUTES = 5;
const CHECKPOINT_COUNT = 24;
const CHIME_SOUND = 'meditation_chime.wav';

export const CHECKPOINT_WINDOW_MINUTES = CHECKPOINT_INTERVAL_MINUTES * CHECKPOINT_COUNT;

const createTimerNotificationId = (timerId, checkpointNumber) => (
  `${TIMER_NOTIFICATION_PREFIX}${timerId}-${checkpointNumber}`
);

const createTimerTimestamps = (endsAt) => Array.from(
  { length: CHECKPOINT_COUNT + 1 },
  (_, checkpointNumber) => (
    endsAt + checkpointNumber * CHECKPOINT_INTERVAL_MINUTES * 60 * 1000
  )
);

export const configureTimerNotifications = async () => {
  if (Platform.OS === 'android') {
    await Promise.all(
      LEGACY_TIMER_CHANNEL_IDS.map((channelId) => (
        Notifications.deleteNotificationChannelAsync(channelId)
      ))
    );

    return MeditationTimerModule.canScheduleExactAlarmsAsync();
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  if (existingPermission.status === 'granted') return true;

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.status === 'granted';
};

export const loadActiveMeditationTimer = async () => {
  try {
    const storedTimer = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
    return storedTimer ? JSON.parse(storedTimer) : null;
  } catch {
    return null;
  }
};

export const reconcileMeditationTimer = async (timer) => {
  if (Platform.OS !== 'android' || !timer?.endsAt) return true;

  const canSchedule = await MeditationTimerModule.canScheduleExactAlarmsAsync();
  if (!canSchedule) return false;

  const nativeTimestamps = await MeditationTimerModule.reconcileAsync();
  if (nativeTimestamps.length) {
    const completedCheckpointCount = CHECKPOINT_COUNT + 1 - nativeTimestamps.length;
    const correctedEndsAt = nativeTimestamps[0]
      - completedCheckpointCount * CHECKPOINT_INTERVAL_MINUTES * 60 * 1000;
    if (correctedEndsAt !== timer.endsAt) {
      const wallClockCorrection = correctedEndsAt - timer.endsAt;
      timer.startedAt = Number.isFinite(timer.startedAt)
        ? timer.startedAt + wallClockCorrection
        : correctedEndsAt - timer.durationMinutes * 60 * 1000;
      timer.endsAt = correctedEndsAt;
      await saveActiveMeditationTimer(timer);
    }
    return true;
  }

  const futureTimestamps = createTimerTimestamps(timer.endsAt)
    .filter(timestamp => timestamp > Date.now());

  if (!futureTimestamps.length) return true;

  await MeditationTimerModule.scheduleAsync(futureTimestamps);
  return true;
};

const saveActiveMeditationTimer = async (timer) => {
  await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
};

export const cancelTimerNotifications = async () => {
  if (Platform.OS === 'android') {
    await MeditationTimerModule.cancelAsync();
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const timerNotifications = scheduledNotifications.filter(({ identifier }) => (
    identifier.startsWith(TIMER_NOTIFICATION_PREFIX)
  ));

  await Promise.all(
    timerNotifications.map(({ identifier }) => (
      Notifications.cancelScheduledNotificationAsync(identifier)
    ))
  );

  const presentedNotifications = await Notifications.getPresentedNotificationsAsync();
  const presentedTimerNotifications = presentedNotifications.filter(({ request }) => (
    request.content.data?.kind === 'meditation-timer'
  ));

  await Promise.all(
    presentedTimerNotifications.map(({ request }) => (
      Notifications.dismissNotificationAsync(request.identifier)
    ))
  );
};

const scheduleTimerNotification = async ({ timerId, date, checkpointNumber }) => {
  const isCompletion = checkpointNumber === 0;

  await Notifications.scheduleNotificationAsync({
    identifier: createTimerNotificationId(timerId, checkpointNumber),
    content: {
      title: isCompletion ? 'Meditation complete' : 'Five-minute checkpoint',
      body: isCompletion
        ? 'Continue if you feel settled. Another chime will sound in five minutes.'
        : `${checkpointNumber * CHECKPOINT_INTERVAL_MINUTES} extra minutes completed.`,
      sound: CHIME_SOUND,
      data: {
        kind: 'meditation-timer',
        timerId,
        checkpointNumber,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? TIMER_CHANNEL_ID : undefined,
    },
  });
};

export const startMeditationTimer = async (durationMinutes) => {
  if (!TIMER_DURATIONS.includes(durationMinutes)) {
    throw new Error('Choose a supported meditation duration.');
  }

  const hasPermission = await configureTimerNotifications();
  if (!hasPermission) {
    const permissionError = new Error('Alarms & reminders access is required for reliable timer chimes.');
    permissionError.code = Platform.OS === 'android'
      ? 'EXACT_ALARM_PERMISSION_REQUIRED'
      : 'NOTIFICATION_PERMISSION_REQUIRED';
    throw permissionError;
  }

  await cancelTimerNotifications();

  const startedAt = Date.now();
  const endsAt = startedAt + durationMinutes * 60 * 1000;
  const timerId = String(startedAt);

  try {
    if (Platform.OS === 'android') {
      const timestamps = createTimerTimestamps(endsAt);
      await MeditationTimerModule.scheduleAsync(timestamps);
    } else {
      await scheduleTimerNotification({
        timerId,
        date: new Date(endsAt),
        checkpointNumber: 0,
      });

      for (let checkpointNumber = 1; checkpointNumber <= CHECKPOINT_COUNT; checkpointNumber++) {
        await scheduleTimerNotification({
          timerId,
          date: new Date(
            endsAt + checkpointNumber * CHECKPOINT_INTERVAL_MINUTES * 60 * 1000
          ),
          checkpointNumber,
        });
      }
    }

    const timer = {
      id: timerId,
      durationMinutes,
      startedAt,
      endsAt,
    };

    await saveActiveMeditationTimer(timer);
    return timer;
  } catch (error) {
    await cancelTimerNotifications();
    await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
    throw error;
  }
};

export const testTimerChime = async () => {
  const hasPermission = await configureTimerNotifications();
  if (!hasPermission) {
    const permissionError = new Error('Timer sound permission is required.');
    permissionError.code = Platform.OS === 'android'
      ? 'EXACT_ALARM_PERMISSION_REQUIRED'
      : 'NOTIFICATION_PERMISSION_REQUIRED';
    throw permissionError;
  }

  if (Platform.OS === 'android') {
    await MeditationTimerModule.scheduleTestAsync();
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: `${TIMER_NOTIFICATION_PREFIX}test-${Date.now()}`,
    content: {
      title: 'Meditation chime test',
      body: 'This is the sound you will hear when your timer completes.',
      sound: CHIME_SOUND,
      data: { kind: 'meditation-timer' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: Platform.OS === 'android' ? TIMER_CHANNEL_ID : undefined,
    },
  });
};

export const finishMeditationTimer = async () => {
  await cancelTimerNotifications();
  await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
};
