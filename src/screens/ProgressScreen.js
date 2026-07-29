import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMeditation } from '../context/MeditationContext';
import { useModal } from '../context/ModalContext';
import { getCalendarGrid, getMonthName, getTodayDate } from '../utils/dateHelpers';
import { SESSION_TYPES } from '../types';
import { COLORS } from '../theme/colors';

export default function ProgressScreen() {
  const { sessions, loading, markSessionComplete, removeSessionComplete, userProgress } = useMeditation();
  const { showModal } = useModal();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [activeTab, setActiveTab] = useState(SESSION_TYPES.MORNING);
  const [pendingSessionData, setPendingSessionData] = useState(null);
  
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
    perfectDays: 0,
    totalHours: Math.round((monthSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60) * 100) / 100
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
    daySessions => (
      daySessions.some(session => session.type === SESSION_TYPES.MORNING)
      && daySessions.some(session => session.type === SESSION_TYPES.EVENING)
    )
  ).length;
  
  const getSessionsForDate = (date) => {
    return sessions.filter(session => session.date === date && session.completed);
  };
  
  const handleDayPress = async (dayData) => {
    if (!dayData.isCurrentMonth) return;
    
    const dateString = dayData.date;
    const isFutureDate = new Date(dateString) > new Date(today);
    
    if (isFutureDate) return;
    
    const daySessions = getSessionsForDate(dateString);
    const hasSession = daySessions.some(s => s.type === activeTab);
    
    if (hasSession) {
      await removeSessionComplete(dateString, activeTab);
    } else {
      // Show duration picker for new sessions
      const sessionData = { date: dateString, type: activeTab };
      setPendingSessionData(sessionData);
      
      showModal('durationPicker', {
        sessionType: activeTab,
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
    const hasCurrentSession = daySession.some(s => s.type === activeTab);
    const isFutureDate = new Date(dayData.date) > new Date(today);
    const isInactive = !dayData.isCurrentMonth || isFutureDate;
    
    const dayStyle = [
      styles.calendarDay,
      !dayData.isCurrentMonth && !hasCurrentSession && styles.inactiveDay,
      !dayData.isCurrentMonth && hasCurrentSession && styles.inactiveCompletedDay,
      dayData.isToday && styles.todayDay,
      isFutureDate && styles.futureDay,
      hasCurrentSession && dayData.isCurrentMonth && styles.completedDay
    ];
    
    const textStyle = [
      styles.dayText,
      !dayData.isCurrentMonth && !hasCurrentSession && styles.inactiveDayText,
      !dayData.isCurrentMonth && hasCurrentSession && styles.inactiveCompletedDayText,
      dayData.isToday && styles.todayText,
      isFutureDate && styles.futureDayText,
      hasCurrentSession && dayData.isCurrentMonth && styles.completedDayText
    ];
    
    return (
      <TouchableOpacity 
        key={dayData.date} 
        style={dayStyle}
        onPress={() => handleDayPress(dayData)}
        activeOpacity={isInactive ? 1 : 0.7}
        disabled={isInactive}
      >
        <Text style={textStyle}>{dayData.day}</Text>
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
        {/* Session Type Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === SESSION_TYPES.MORNING && styles.activeTab
            ]}
            onPress={() => setActiveTab(SESSION_TYPES.MORNING)}
          >
            <Text style={styles.tabIcon}>☀️</Text>
            <Text style={[
              styles.tabText,
              activeTab === SESSION_TYPES.MORNING && styles.activeTabText
            ]}>Morning</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === SESSION_TYPES.EVENING && styles.activeTab
            ]}
            onPress={() => setActiveTab(SESSION_TYPES.EVENING)}
          >
            <Text style={styles.tabIcon}>🌙</Text>
            <Text style={[
              styles.tabText,
              activeTab === SESSION_TYPES.EVENING && styles.activeTabText
            ]}>Evening</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateMonth('prev')}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.surface} />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {monthName} {selectedYear}
          </Text>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigateMonth('next')}
          >
            <Ionicons name="chevron-forward" size={24} color={COLORS.surface} />
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
          
          <View style={styles.statsGridThree}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{monthlyStats.totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{monthlyStats.totalHours}h</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{monthlyStats.perfectDays}</Text>
              <Text style={styles.statLabel}>Perfect Days</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: COLORS.morning }]}>
                {monthlyStats.morningCount}
              </Text>
              <Text style={styles.statLabel}>Morning Sessions</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: COLORS.evening }]}>
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
              <View style={styles.globalStatItem}>
                <Text style={styles.globalStatNumber}>{userProgress.totalHours || 0}h</Text>
                <Text style={styles.globalStatLabel}>Total Hours</Text>
              </View>
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
    backgroundColor: COLORS.background,
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
    color: COLORS.textMuted,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.surface,
    marginBottom: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryActive,
    borderRadius: 22,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
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
    color: COLORS.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    margin: 10,
    paddingVertical: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    margin: 10,
    borderRadius: 15,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primaryActive,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.surface,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    marginVertical: 3,
    marginHorizontal: 0,
  },
  inactiveDay: {
    opacity: 0.3,
  },
  inactiveCompletedDay: {
    backgroundColor: COLORS.primaryOverlay,
  },
  todayDay: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 2,
    borderColor: COLORS.primaryActive,
  },
  futureDay: {
    opacity: 0.5,
  },
  completedDay: {
    backgroundColor: COLORS.primaryActive,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  inactiveDayText: {
    color: COLORS.textSubtle,
  },
  inactiveCompletedDayText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  todayText: {
    color: COLORS.primaryActive,
    fontWeight: 'bold',
  },
  futureDayText: {
    color: COLORS.disabled,
  },
  completedDayText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  statsPanel: {
    margin: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
  },
  statsPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsGridThree: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 5,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  globalStats: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  globalStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
    color: COLORS.primaryActive,
    marginBottom: 5,
  },
  globalStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
