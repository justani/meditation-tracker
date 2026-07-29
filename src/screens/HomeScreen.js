import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useMeditation } from '../context/MeditationContext';
import { useModal } from '../context/ModalContext';
import { formatDateDisplay, getTodayDate } from '../utils/dateHelpers';
import { SESSION_TYPES } from '../types';
import MeditationCircle from '../components/MeditationCircle';
import { getDailyQuote } from '../utils/notificationMessages';
import { clearAllData } from '../utils/storage';
import { COLORS } from '../theme/colors';

export default function HomeScreen() {
  const { userProgress, loading, getSession, markSessionComplete, removeSessionComplete, settings, loadAppData } = useMeditation();
  const { showModal } = useModal();
  const [pendingSessionData, setPendingSessionData] = useState(null);
  
  const today = getTodayDate();
  const todayFormatted = formatDateDisplay(today);
  const dailyQuote = getDailyQuote(settings.language);
  
  const morningSession = getSession(today, SESSION_TYPES.MORNING);
  const eveningSession = getSession(today, SESSION_TYPES.EVENING);
  const isFirstTimeUser = settings.isFirstTimeUser;
  
  const handleSessionToggle = async (type) => {
    const session = getSession(today, type);
    
    if (session?.completed) {
      // Session is already complete, so remove it
      const success = await removeSessionComplete(today, type);
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
          <Text style={styles.streakNumber}>{userProgress.currentStreak}</Text>
          <Text style={styles.streakDays}>days</Text>
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

        {/* Temporary reset button for testing - remove in production */}
        {__DEV__ && (
          <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
            <Text style={styles.resetButtonText}>Reset Data (Testing)</Text>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProgress.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProgress.longestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userProgress.totalHours || 0}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
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
    marginBottom: 30,
  },
  dateText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
  },
  quoteContainer: {
    backgroundColor: COLORS.surface,
    marginBottom: 25,
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryActive,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quoteText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    lineHeight: 56,
  },
  streakDays: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 20,
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
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
