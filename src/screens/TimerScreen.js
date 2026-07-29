import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Haptics from 'expo-haptics';
import { useMeditation } from '../context/MeditationContext';
import { COLORS } from '../theme/colors';
import {
  CHECKPOINT_WINDOW_MINUTES,
  finishMeditationTimer,
  loadActiveMeditationTimer,
  reconcileMeditationTimer,
  startMeditationTimer,
  testTimerChime,
  TIMER_DURATIONS,
} from '../services/meditationTimerService';

const ANDROID_EXACT_ALARM_SETTINGS = 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM';
const ANDROID_PACKAGE = 'com.meditationtracker.app';

const formatTime = (milliseconds) => {
  const absoluteSeconds = milliseconds > 0
    ? Math.ceil(milliseconds / 1000)
    : Math.floor(Math.abs(milliseconds) / 1000);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const seconds = absoluteSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatAccessibilityTime = (milliseconds, isOvertime) => {
  const absoluteSeconds = milliseconds > 0
    ? Math.ceil(milliseconds / 1000)
    : Math.floor(Math.abs(milliseconds) / 1000);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const seconds = absoluteSeconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (!hours && seconds) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  if (!parts.length) parts.push('0 seconds');
  return `${parts.join(' ')} ${isOvertime ? 'overtime' : 'remaining'}`;
};

export default function TimerScreen({ route }) {
  const { recordTimerSession } = useMeditation();
  const [selectedDuration, setSelectedDuration] = useState(20);
  const [activeTimer, setActiveTimer] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [isTestingChime, setIsTestingChime] = useState(false);
  const [alarmAccessAvailable, setAlarmAccessAvailable] = useState(true);
  const [timerRestored, setTimerRestored] = useState(false);
  const handledNotificationStartRef = useRef(null);

  const restoreTimer = useCallback(async () => {
    const storedTimer = await loadActiveMeditationTimer();
    if (storedTimer) {
      try {
        const reconciled = await reconcileMeditationTimer(storedTimer);
        setAlarmAccessAvailable(reconciled);
      } catch (error) {
        console.error('Error restoring meditation timer alarms:', error);
        setAlarmAccessAvailable(Platform.OS !== 'android');
      }
    } else {
      setAlarmAccessAvailable(true);
    }
    setActiveTimer(storedTimer);
    setNow(Date.now());
    setTimerRestored(true);
  }, []);

  useEffect(() => {
    restoreTimer();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') restoreTimer();
    });

    return () => appStateSubscription.remove();
  }, [restoreTimer]);

  useEffect(() => {
    if (!activeTimer) return undefined;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const openAlarmSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync(ANDROID_EXACT_ALARM_SETTINGS, {
          data: `package:${ANDROID_PACKAGE}`,
        });
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      await Linking.openSettings();
    }
  };

  const handleStart = async (durationOverride = null) => {
    const durationToStart = durationOverride || selectedDuration;
    if (durationOverride) setSelectedDuration(durationOverride);
    setIsStarting(true);

    try {
      const timer = await startMeditationTimer(durationToStart);
      setActiveTimer(timer);
      setAlarmAccessAvailable(true);
      setNow(Date.now());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const permissionDenied = error.code === 'NOTIFICATION_PERMISSION_REQUIRED';
      const exactAlarmDenied = error.code === 'EXACT_ALARM_PERMISSION_REQUIRED'
        || error.code === 'ERR_EXACT_ALARM_PERMISSION';
      Alert.alert(
        permissionDenied
          ? 'Allow notifications'
          : exactAlarmDenied
            ? 'Allow alarms & reminders'
            : 'Timer could not start',
        permissionDenied
          ? 'Timer chimes need notification permission. Enable notifications in Android settings and try again.'
          : exactAlarmDenied
            ? 'Android needs this access to wake the app and play the chime at the exact time.'
            : 'The timer could not be scheduled. Please try again.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: openAlarmSettings },
        ]
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    const requestId = route?.params?.notificationStartRequestId;
    const requestedDuration = route?.params?.notificationStartDuration;

    if (
      !timerRestored
      || activeTimer
      || !requestId
      || handledNotificationStartRef.current === requestId
    ) {
      return;
    }

    handledNotificationStartRef.current = requestId;
    handleStart(requestedDuration);
  }, [
    activeTimer,
    route?.params?.notificationStartDuration,
    route?.params?.notificationStartRequestId,
    timerRestored,
  ]);

  const handleTestChime = async () => {
    setIsTestingChime(true);

    try {
      await testTimerChime();
      Alert.alert('Chime scheduled', 'You should hear the five-second chime in two seconds.');
    } catch (error) {
      Alert.alert(
        'Could not test chime',
        'Allow Alarms & reminders and keep alarm volume audible, then try again.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: openAlarmSettings },
        ]
      );
    } finally {
      setIsTestingChime(false);
    }
  };

  const handleFinish = () => {
    const latestRecordedAt = Math.min(
      Date.now(),
      activeTimer.endsAt + CHECKPOINT_WINDOW_MINUTES * 60 * 1000
    );
    const elapsedMinutes = Math.max(
      1,
      Math.round((latestRecordedAt - activeTimer.startedAt) / 60000)
    );
    const isStale = Date.now() > latestRecordedAt;

    Alert.alert(
      'Finish meditation?',
      isStale
        ? `The checkpoint window ended earlier, so this will save at most ${elapsedMinutes} minutes rather than counting unattended time.`
        : `You meditated for about ${elapsedMinutes} minutes. Future checkpoint chimes will be cancelled.`,
      [
        { text: 'Keep meditating', style: 'cancel' },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: async () => {
            try {
              const completedAt = Math.min(
                Date.now(),
                activeTimer.endsAt + CHECKPOINT_WINDOW_MINUTES * 60 * 1000
              );
              const duration = Math.max(
                1,
                Math.round((completedAt - activeTimer.startedAt) / 60000)
              );
              const saved = await recordTimerSession({
                timerId: activeTimer.id,
                startedAt: activeTimer.startedAt,
                completedAt,
                duration,
              });
              if (!saved) {
                Alert.alert(
                  'Could not save meditation',
                  'Your timer is still active. Please try finishing again.'
                );
                return;
              }
              await finishMeditationTimer();
              setActiveTimer(null);
            } catch (error) {
              Alert.alert('Could not finish timer', 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const remainingMilliseconds = activeTimer ? activeTimer.endsAt - now : 0;
  const isOvertime = remainingMilliseconds <= 0;
  const checkpointWindowEnded = activeTimer
    ? now >= activeTimer.endsAt + CHECKPOINT_WINDOW_MINUTES * 60 * 1000
    : false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTimer ? (
          <View style={styles.activeTimerCard}>
            <Text style={styles.timerEyebrow}>
              {isOvertime ? 'CONTINUING IN SILENCE' : 'MEDITATION IN PROGRESS'}
            </Text>
            <Text
              accessibilityLabel={formatAccessibilityTime(remainingMilliseconds, isOvertime)}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              numberOfLines={1}
              style={[styles.timerValue, isOvertime && styles.overtimeValue]}
            >
              {isOvertime ? '+' : ''}{formatTime(remainingMilliseconds)}
            </Text>
            <Text style={styles.timerCaption}>
              {isOvertime
                ? checkpointWindowEnded
                  ? 'The two-hour checkpoint window has ended.'
                  : 'A short chime sounds every five minutes.'
                : `${activeTimer.durationMinutes}-minute meditation`}
            </Text>

            {!alarmAccessAvailable && (
              <View style={styles.activeAlarmWarning}>
                <Text style={styles.activeAlarmWarningTitle}>Alarm access required</Text>
                <Text style={styles.activeAlarmWarningText}>
                  Checkpoint chimes are paused until “Alarms & reminders” access is restored.
                </Text>
                <Pressable accessibilityRole="button" onPress={openAlarmSettings}>
                  <Text style={styles.activeAlarmWarningLink}>Open alarm settings</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.finishButton, pressed && styles.buttonPressed]}
              onPress={handleFinish}
            >
              <Text style={styles.finishButtonText}>Finish meditation</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Choose your sitting time</Text>
              <Text style={styles.introText}>
                One gentle chime marks the end. If you continue, another chime sounds every five minutes for up to two extra hours—no snoozing required.
              </Text>
            </View>

            <View
              accessibilityLabel="Meditation duration"
              accessibilityRole="radiogroup"
              style={styles.durationGrid}
            >
              {TIMER_DURATIONS.map((duration) => {
                const isSelected = duration === selectedDuration;
                return (
                  <Pressable
                    accessibilityLabel={`${duration} minutes`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    key={duration}
                    style={({ pressed }) => [
                      styles.durationButton,
                      isSelected && styles.selectedDurationButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <Text style={[
                      styles.durationValue,
                      isSelected && styles.selectedDurationText,
                    ]}>
                      {duration}
                    </Text>
                    <Text style={[
                      styles.durationUnit,
                      isSelected && styles.selectedDurationText,
                    ]}>
                      minutes
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isStarting}
              style={({ pressed }) => [
                styles.startButton,
                (pressed || isStarting) && styles.buttonPressed,
              ]}
              onPress={() => handleStart()}
            >
              <Text style={styles.startButtonText}>
                {isStarting ? 'Preparing timer…' : `Start ${selectedDuration}-minute timer`}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isTestingChime}
              style={({ pressed }) => [
                styles.testButton,
                (pressed || isTestingChime) && styles.buttonPressed,
              ]}
              onPress={handleTestChime}
            >
              <Text style={styles.testButtonText}>
                {isTestingChime ? 'Scheduling chime…' : 'Test five-second chime'}
              </Text>
            </Pressable>

          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    gap: 22,
  },
  introCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  introTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  introText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  durationButton: {
    width: '30%',
    flexGrow: 1,
    minWidth: 90,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    alignItems: 'center',
  },
  selectedDurationButton: {
    backgroundColor: COLORS.primaryActive,
    borderColor: COLORS.primaryActive,
  },
  durationValue: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  durationUnit: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
  selectedDurationText: {
    color: COLORS.surface,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: COLORS.surface,
    fontSize: 17,
    fontWeight: '700',
  },
  testButton: {
    borderWidth: 1,
    borderColor: COLORS.sage,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  testButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  activeTimerCard: {
    flex: 1,
    minHeight: 460,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  timerEyebrow: {
    color: COLORS.sageLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  timerValue: {
    color: COLORS.surface,
    fontSize: 72,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  overtimeValue: {
    color: COLORS.gold,
  },
  timerCaption: {
    color: COLORS.sageLight,
    fontSize: 16,
    textAlign: 'center',
  },
  activeAlarmWarning: {
    width: '100%',
    backgroundColor: COLORS.warningBackground,
    borderRadius: 14,
    padding: 15,
    gap: 5,
  },
  activeAlarmWarningTitle: {
    color: COLORS.warningText,
    fontSize: 15,
    fontWeight: '700',
  },
  activeAlarmWarningText: {
    color: COLORS.warningText,
    fontSize: 13,
    lineHeight: 19,
  },
  activeAlarmWarningLink: {
    color: COLORS.warning,
    fontSize: 14,
    fontWeight: '700',
    paddingTop: 4,
  },
  finishButton: {
    marginTop: 34,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  finishButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
