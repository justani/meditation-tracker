import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useMeditation } from '../context/MeditationContext';
import { getCalendarGrid, getMonthName, getTodayDate } from '../utils/dateHelpers';
import { SESSION_TYPES } from '../types';

export default function ProgressScreen() {
  const { sessions, loading, markSessionComplete, removeSessionComplete, userProgress } = useMeditation();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  
  const calendarGrid = getCalendarGrid(selectedYear, selectedMonth);
  const monthName = getMonthName(selectedMonth);
  const today = getTodayDate();
  
  // Calculate monthly statistics
  const monthSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate.getMonth() === selectedMonth && 
           sessionDate.getFullYear() === selectedYear && 
           session.completed;
  });
  
  const monthlyStats = {
    totalSessions: monthSessions.length,
    morningCount: monthSessions.filter(s => s.type === SESSION_TYPES.MORNING).length,
    eveningCount: monthSessions.filter(s => s.type === SESSION_TYPES.EVENING).length,
    perfectDays: 0
  };
  
  // Count perfect days (both sessions completed on same day)
  const sessionsByDate = {};
  monthSessions.forEach(session => {
    if (!sessionsByDate[session.date]) {
      sessionsByDate[session.date] = [];
    }
    sessionsByDate[session.date].push(session);
  });
  
  monthlyStats.perfectDays = Object.values(sessionsByDate).filter(
    daySessions => daySessions.length === 2
  ).length;
  
  const getSessionsForDate = (date) => {
    return sessions.filter(session => session.date === date && session.completed);
  };
  
  const handleDayPress = (dayData) => {
    if (!dayData.isCurrentMonth) return;
    
    const dateString = dayData.date;
    const isFutureDate = new Date(dateString) > new Date(today);
    
    if (isFutureDate) {
      Alert.alert('Future Date', 'You cannot log meditation sessions for future dates.');
      return;
    }
    
    const daySessions = getSessionsForDate(dateString);
    const hasMorning = daySessions.some(s => s.type === SESSION_TYPES.MORNING);
    const hasEvening = daySessions.some(s => s.type === SESSION_TYPES.EVENING);
    
    const options = [];
    
    // Add options for marking sessions
    if (!hasMorning) {
      options.push({
        text: 'Mark Morning Session',
        onPress: () => markSessionComplete(dateString, SESSION_TYPES.MORNING)
      });
    }
    
    if (!hasEvening) {
      options.push({
        text: 'Mark Evening Session', 
        onPress: () => markSessionComplete(dateString, SESSION_TYPES.EVENING)
      });
    }
    
    // Add options for removing sessions
    if (hasMorning) {
      options.push({
        text: 'Remove Morning Session',
        style: 'destructive',
        onPress: async () => {
          const success = await removeSessionComplete(dateString, SESSION_TYPES.MORNING);
          if (success) {
            Alert.alert('Success', 'Morning session removed successfully');
          } else {
            Alert.alert('Error', 'Failed to remove morning session');
          }
        }
      });
    }
    
    if (hasEvening) {
      options.push({
        text: 'Remove Evening Session',
        style: 'destructive',
        onPress: async () => {
          const success = await removeSessionComplete(dateString, SESSION_TYPES.EVENING);
          if (success) {
            Alert.alert('Success', 'Evening session removed successfully');
          } else {
            Alert.alert('Error', 'Failed to remove evening session');
          }
        }
      });
    }
    
    if (options.length === 0) {
      Alert.alert('No Options', 'No sessions available for this date.');
      return;
    }
    
    options.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert(
      `${dayData.day} ${getMonthName(dayData.month).substring(0, 3)}`,
      'Choose an action:',
      options
    );
  };
  
  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };
  
  const renderCalendarDay = (dayData) => {
    const daySession = getSessionsForDate(dayData.date);
    const hasMorning = daySession.some(s => s.type === SESSION_TYPES.MORNING);
    const hasEvening = daySession.some(s => s.type === SESSION_TYPES.EVENING);
    const hasFullDay = hasMorning && hasEvening;
    
    const dayStyle = [
      styles.calendarDay,
      !dayData.isCurrentMonth && styles.inactiveDay,
      dayData.isToday && styles.todayDay,
      hasFullDay && styles.fullCompletionDay,
      (hasMorning || hasEvening) && !hasFullDay && styles.partialCompletionDay
    ];
    
    const textStyle = [
      styles.dayText,
      !dayData.isCurrentMonth && styles.inactiveDayText,
      dayData.isToday && styles.todayText,
      (hasMorning || hasEvening) && styles.completedDayText
    ];
    
    return (
      <TouchableOpacity 
        key={dayData.date} 
        style={dayStyle}
        onPress={() => handleDayPress(dayData)}
        activeOpacity={0.7}
      >
        <Text style={textStyle}>{dayData.day}</Text>
        {(hasMorning || hasEvening) && (
          <View style={styles.sessionIndicators}>
            {hasMorning && <View style={styles.morningIndicator} />}
            {hasEvening && <View style={styles.eveningIndicator} />}
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {monthName} {selectedYear}
          </Text>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
        
        {/* Calendar Days Header */}
        <View style={styles.daysHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.dayHeaderText}>{day}</Text>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarGrid.map(renderCalendarDay)}
        </View>
        
        {/* Statistics Panel */}
        <View style={styles.statsPanel}>
          <Text style={styles.statsPanelTitle}>Monthly Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{monthlyStats.totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{monthlyStats.perfectDays}</Text>
              <Text style={styles.statLabel}>Perfect Days</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#FFA500' }]}>
                {monthlyStats.morningCount}
              </Text>
              <Text style={styles.statLabel}>Morning Sessions</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#4169E1' }]}>
                {monthlyStats.eveningCount}
              </Text>
              <Text style={styles.statLabel}>Evening Sessions</Text>
            </View>
          </View>
          
          <View style={styles.globalStats}>
            <Text style={styles.globalStatsTitle}>Overall Progress</Text>
            <View style={styles.globalStatsRow}>
              <View style={styles.globalStatItem}>
                <Text style={styles.globalStatNumber}>{userProgress.currentStreak}</Text>
                <Text style={styles.globalStatLabel}>Current Streak</Text>
              </View>
              <View style={styles.globalStatItem}>
                <Text style={styles.globalStatNumber}>{userProgress.longestStreak}</Text>
                <Text style={styles.globalStatLabel}>Best Streak</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.fullCompletionDay]} />
              <Text style={styles.legendText}>Both sessions completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, styles.partialCompletionDay]} />
              <Text style={styles.legendText}>One session completed</Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 22,
  },
  navButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  daysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 10,
    paddingVertical: 10,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    position: 'relative',
  },
  inactiveDay: {
    opacity: 0.3,
  },
  todayDay: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  fullCompletionDay: {
    backgroundColor: '#4A90E2',
  },
  partialCompletionDay: {
    backgroundColor: '#87CEEB',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  inactiveDayText: {
    color: '#999',
  },
  todayText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  completedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sessionIndicators: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
  },
  morningIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFA500',
    marginRight: 2,
  },
  eveningIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4169E1',
  },
  legend: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  legendItems: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  statsPanel: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
  },
  statsPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  globalStats: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  globalStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  globalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  globalStatItem: {
    alignItems: 'center',
  },
  globalStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  globalStatLabel: {
    fontSize: 12,
    color: '#666',
  },
});