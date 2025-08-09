import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useMeditation } from '../context/MeditationContext';
import { formatDateDisplay, getTodayDate } from '../utils/dateHelpers';
import { SESSION_TYPES } from '../types';
import MeditationCircle from '../components/MeditationCircle';
import { getDailyQuote } from '../utils/notificationMessages';
import { clearAllData } from '../utils/storage';

export default function HomeScreen() {
  const { userProgress, loading, getSession, markSessionComplete, removeSessionComplete, settings, loadAppData } = useMeditation();
  
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
      // Mark session complete with default 1 hour (60 minutes)
      const success = await markSessionComplete(today, type, 60);
      if (!success) {
        console.error('Failed to mark session as complete');
      }
    }
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
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading your meditation data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#666',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  quoteContainer: {
    backgroundColor: '#fff',
    marginBottom: 25,
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    shadowColor: '#000',
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
    color: '#2c3e50',
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
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
    color: '#666',
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4A90E2',
    lineHeight: 56,
  },
  streakDays: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  instructionsContainer: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  instructionsText: {
    fontSize: 14,
    color: '#2c3e50',
    textAlign: 'center',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  resetButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderRadius: 15,
    shadowColor: '#000',
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
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});