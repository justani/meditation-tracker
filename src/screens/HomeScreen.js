import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useMeditation } from '../context/MeditationContext';
import { useModal } from '../context/ModalContext';
import { formatDateDisplay, getTodayDate } from '../utils/dateHelpers';
import { SESSION_TYPES } from '../types';
import MeditationCircle from '../components/MeditationCircle';
import { getDailyQuote } from '../utils/notificationMessages';
import { formatMeditationTime, getSessionPeriod } from '../utils/sessionHelpers';
import { clearAllData } from '../utils/storage';
import { COLORS } from '../theme/colors';

export default function HomeScreen() {
  const {
    sessions,
    userProgress,
    loading,
    markSessionComplete,
    removeSessionComplete,
    settings,
    loadAppData,
  } = useMeditation();
  const { showModal } = useModal();
  const [pendingSessionData, setPendingSessionData] = useState(null);
  
  const today = getTodayDate();
  const todayFormatted = formatDateDisplay(today);
  const dailyQuote = getDailyQuote(settings.language);

  const todaySessions = sessions.filter(
    session => session.date === today && session.completed
  );
  const getTodaySessionForPeriod = (period) => (
    todaySessions.find(session => session.type === period)
    || todaySessions.find(session => getSessionPeriod(session) === period)
  );
  const morningSession = getTodaySessionForPeriod(SESSION_TYPES.MORNING);
  const eveningSession = getTodaySessionForPeriod(SESSION_TYPES.EVENING);
  const todayMinutes = todaySessions.reduce(
    (sum, session) => sum + (session.duration || 0),
    0
  );
  const lifetimeMinutes = sessions
    .filter(session => session.completed)
    .reduce((sum, session) => sum + (session.duration || 0), 0);
  const hasMeditatedToday = todaySessions.length > 0;
  const streakMessage = userProgress.currentStreak === 0
    ? 'Begin a new streak today'
    : hasMeditatedToday
      ? 'Your streak is safe for today'
      : 'Meditate today to keep it going';
  const todaySummary = hasMeditatedToday
    ? `${formatMeditationTime(todayMinutes)} · ${todaySessions.length} ${todaySessions.length === 1 ? 'session' : 'sessions'}`
    : 'No meditation recorded yet';
  const periodSummary = `Morning ${morningSession ? 'completed' : 'available'} · Evening ${eveningSession ? 'completed' : 'available'}`;
  const isFirstTimeUser = settings.isFirstTimeUser;
  
  const handleSessionToggle = async (type) => {
    const session = getTodaySessionForPeriod(type);
    
    if (session?.completed) {
      // Session is already complete, so remove it
      const success = await removeSessionComplete(today, session.type, session.id);
      if (!success) {
        console.error('Failed to remove session');
      }
    } else {
      // Show duration picker for new sessions
      const sessionData = { date: today, type };
      setPendingSessionData(sessionData);
      
      showModal('durationPicker', {
        sessionType: type,
        onConfirm: (duration) => handleDurationConfirm(duration, sessionData),
        onCancel: handleDurationCancel
      });
    }
  };


  const handleDurationConfirm = async (duration, sessionData = pendingSessionData) => {
    if (sessionData) {
      await markSessionComplete(sessionData.date, sessionData.type, duration);
      setPendingSessionData(null);
    }
  };

  const handleDurationCancel = () => {
    setPendingSessionData(null);
  };


  // Temporary function for testing - remove in production
  const handleResetData = async () => {
    await clearAllData();
    await loadAppData(); // Reload app data
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryActive} />
          <Text style={styles.loadingText}>Loading your meditation data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Date Display */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{todayFormatted}</Text>
        </View>

        {/* Daily Vipassana Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>{dailyQuote}</Text>
        </View>

        {/* Streak Counter */}
        <View style={styles.streakContainer}>
          <Text style={styles.streakLabel}>Current Streak</Text>
          <Text
            style={styles.streakNumber}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {userProgress.currentStreak}
          </Text>
          <Text style={styles.streakDays}>days</Text>
          <Text style={styles.streakMessage}>{streakMessage}</Text>
        </View>

        {/* Meditation Circles */}
        <View style={styles.circlesContainer}>
          <MeditationCircle
            type={SESSION_TYPES.MORNING}
            completed={morningSession?.completed || false}
            onPress={() => console.log('Morning circle pressed')}
            onLongPress={() => handleSessionToggle(SESSION_TYPES.MORNING)}
          />
          
          <MeditationCircle
            type={SESSION_TYPES.EVENING}
            completed={eveningSession?.completed || false}
            onPress={() => console.log('Evening circle pressed')}
            onLongPress={() => handleSessionToggle(SESSION_TYPES.EVENING)}
          />
        </View>

        {/* First-time user instructions */}
        {isFirstTimeUser && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              💡 Hold and press each circle to mark your meditation complete
            </Text>
          </View>
        )}

        {/* Today's Practice */}
        <View style={styles.todayPracticeContainer}>
          <Text style={styles.sectionTitle}>Today's Practice</Text>
          <Text style={styles.todaySummary}>{todaySummary}</Text>
          <Text style={styles.periodSummary}>{periodSummary}</Text>
        </View>

        {/* Temporary reset button for testing - remove in production */}
        {__DEV__ && (
          <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
            <Text style={styles.resetButtonText}>Reset Data (Testing)</Text>
          </TouchableOpacity>
        )}

        {/* Lifetime Progress */}
        <Text style={styles.sectionTitle}>Your Journey</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProgress.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProgress.longestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={styles.statNumber}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {formatMeditationTime(lifetimeMinutes)}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  dateText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
  },
  quoteContainer: {
    backgroundColor: COLORS.primaryWash,
    marginBottom: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
  },
  quoteText: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: COLORS.surface,
    padding: 25,
    borderRadius: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  streakLabel: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  streakNumber: {
    width: 140,
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  streakDays: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  streakMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryActive,
    marginTop: 12,
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  todayPracticeContainer: {
    paddingVertical: 18,
    marginBottom: 25,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  todaySummary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    marginBottom: 6,
  },
  periodSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  instructionsContainer: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryActive,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: COLORS.error,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  resetButtonText: {
    color: COLORS.surface,
    textAlign: 'center',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: 20,
    borderRadius: 15,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statNumber: {
    width: '100%',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    marginBottom: 4,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
