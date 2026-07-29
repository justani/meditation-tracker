import React, { useCallback, useEffect, useState } from 'react';
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
import {
  CHECKPOINT_WINDOW_MINUTES,
  finishMeditationTimer,
  loadActiveMeditationTimer,
  startMeditationTimer,
  testTimerChime,
  TIMER_DURATIONS,
} from '../services/meditationTimerService';

const ANDROID_EXACT_ALARM_SETTINGS = 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM';
const ANDROID_PACKAGE = 'com.meditationtracker.app';

const formatTime = (milliseconds) => {
  const absoluteSeconds = Math.floor(Math.abs(milliseconds) / 1000);
  const minutes = Math.floor(absoluteSeconds / 60);
  const seconds = absoluteSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function TimerScreen() {
  const [selectedDuration, setSelectedDuration] = useState(20);
  const [activeTimer, setActiveTimer] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [isStarting, setIsStarting] = useState(false);
  const [isTestingChime, setIsTestingChime] = useState(false);

  const restoreTimer = useCallback(async () => {
    const storedTimer = await loadActiveMeditationTimer();
    setActiveTimer(storedTimer);
    setNow(Date.now());
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

  const handleStart = async () => {
    setIsStarting(true);

    try {
      const timer = await startMeditationTimer(selectedDuration);
      setActiveTimer(timer);
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
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - activeTimer.startedAt) / 60000));

    Alert.alert(
      'Finish meditation?',
      `You meditated for about ${elapsedMinutes} minutes. Future checkpoint chimes will be cancelled.`,
      [
        { text: 'Keep meditating', style: 'cancel' },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: async () => {
            try {
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
            <Text style={[styles.timerValue, isOvertime && styles.overtimeValue]}>
              {isOvertime ? '+' : ''}{formatTime(remainingMilliseconds)}
            </Text>
            <Text style={styles.timerCaption}>
              {isOvertime
                ? checkpointWindowEnded
                  ? 'The two-hour checkpoint window has ended.'
                  : 'A short chime sounds every five minutes.'
                : `${activeTimer.durationMinutes}-minute meditation`}
            </Text>

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

            <View style={styles.durationGrid}>
              {TIMER_DURATIONS.map((duration) => {
                const isSelected = duration === selectedDuration;
                return (
                  <Pressable
                    accessibilityRole="button"
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
              onPress={handleStart}
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

            {Platform.OS === 'android' && Platform.Version >= 31 && (
              <View style={styles.reliabilityCard}>
                <Text style={styles.reliabilityTitle}>Make alarms reliable</Text>
                <Text style={styles.reliabilityText}>
                  Android 12 and newer requires “Alarms & reminders” access. The chime uses alarm volume directly, so ordinary notification volume may stay at zero.
                </Text>
                <Pressable accessibilityRole="button" onPress={openAlarmSettings}>
                  <Text style={styles.settingsLink}>Open alarm settings</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f5',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    gap: 22,
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2ebe6',
  },
  introTitle: {
    color: '#173f35',
    fontSize: 22,
    fontWeight: '700',
  },
  introText: {
    color: '#526760',
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
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce7e1',
    paddingVertical: 18,
    alignItems: 'center',
  },
  selectedDurationButton: {
    backgroundColor: '#2d7a67',
    borderColor: '#2d7a67',
  },
  durationValue: {
    color: '#23473e',
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  durationUnit: {
    color: '#667a74',
    fontSize: 12,
  },
  selectedDurationText: {
    color: '#fff',
  },
  startButton: {
    backgroundColor: '#173f35',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  testButton: {
    borderWidth: 1,
    borderColor: '#9bb8ae',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#23473e',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  reliabilityCard: {
    backgroundColor: '#eef5ff',
    borderRadius: 16,
    padding: 18,
    gap: 7,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  reliabilityTitle: {
    color: '#284968',
    fontSize: 15,
    fontWeight: '700',
  },
  reliabilityText: {
    color: '#50677b',
    fontSize: 13,
    lineHeight: 20,
  },
  settingsLink: {
    color: '#276fae',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 5,
  },
  activeTimerCard: {
    flex: 1,
    minHeight: 460,
    backgroundColor: '#173f35',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  timerEyebrow: {
    color: '#b9d9d0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  timerValue: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  overtimeValue: {
    color: '#d7c68c',
  },
  timerCaption: {
    color: '#d5e4df',
    fontSize: 16,
    textAlign: 'center',
  },
  finishButton: {
    marginTop: 34,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  finishButtonText: {
    color: '#173f35',
    fontSize: 16,
    fontWeight: '700',
  },
});
