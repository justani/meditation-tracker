import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMeditation } from '../context/MeditationContext';
import { useModal } from '../context/ModalContext';
import { getCalendarGrid, getDaysInMonth, getMonthName, getTodayDate } from '../utils/dateHelpers';
import { formatMeditationTime, getSessionPeriod } from '../utils/sessionHelpers';
import { SESSION_TYPES } from '../types';
import { COLORS } from '../theme/colors';

const getMonthKey = (year, month) => (
  `${year}-${String(month + 1).padStart(2, '0')}`
);

const getPracticeDayCount = (monthSessions, dayLimit) => (
  new Set(
    monthSessions
      .filter(session => Number(session.date.slice(8, 10)) <= dayLimit)
      .map(session => session.date)
  ).size
);

const getPracticeComparison = ({
  isFutureMonth,
  practiceDays,
  previousPracticeDays,
  comparisonPeriodLabel,
}) => {
  if (isFutureMonth) return 'This month has not started yet';
  if (practiceDays === 0) return 'No practice recorded in this period yet';
  if (previousPracticeDays === 0) {
    return `No practice days in ${comparisonPeriodLabel}`;
  }

  const difference = practiceDays - previousPracticeDays;
  if (difference === 0) {
    return `Same number of practice days as ${comparisonPeriodLabel}`;
  }

  const differenceLabel = Math.abs(difference) === 1 ? 'day' : 'days';
  return `${Math.abs(difference)} ${difference > 0 ? 'more' : 'fewer'} practice ${differenceLabel} than ${comparisonPeriodLabel}`;
};

export default function ProgressScreen() {
  const { sessions, loading, markSessionComplete, removeSessionComplete } = useMeditation();
  const { showModal } = useModal();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [activeTab, setActiveTab] = useState(SESSION_TYPES.MORNING);
  const [pendingSessionData, setPendingSessionData] = useState(null);
  
  const calendarGrid = getCalendarGrid(selectedYear, selectedMonth);
  const monthName = getMonthName(selectedMonth);
  const today = getTodayDate();
  
  // Calculate monthly statistics. Timer sessions are grouped by their local start time.
  const selectedMonthKey = getMonthKey(selectedYear, selectedMonth);
  const completedSessions = sessions.filter(session => session.completed);
  const monthSessions = completedSessions.filter(
    session => session.date.startsWith(selectedMonthKey)
  );
  const selectedMonthDate = new Date(selectedYear, selectedMonth, 1);
  const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const isCurrentMonth = selectedMonthDate.getTime() === currentMonthDate.getTime();
  const isFutureMonth = selectedMonthDate > currentMonthDate;
  const availableDays = isFutureMonth
    ? 0
    : isCurrentMonth
      ? currentDate.getDate()
      : getDaysInMonth(selectedYear, selectedMonth);
  const totalMinutes = monthSessions.reduce((sum, session) => sum + (session.duration || 0), 0);

  const previousMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
  const previousMonthKey = getMonthKey(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth()
  );
  const previousMonthSessions = completedSessions.filter(
    session => session.date.startsWith(previousMonthKey)
  );
  const previousPeriodDays = Math.min(
    availableDays,
    getDaysInMonth(previousMonthDate.getFullYear(), previousMonthDate.getMonth())
  );

  const monthlyStats = {
    totalSessions: monthSessions.length,
    morningCount: monthSessions.filter(
      session => getSessionPeriod(session) === SESSION_TYPES.MORNING
    ).length,
    eveningCount: monthSessions.filter(
      session => getSessionPeriod(session) === SESSION_TYPES.EVENING
    ).length,
    practiceDays: getPracticeDayCount(monthSessions, availableDays),
    meditationTime: formatMeditationTime(totalMinutes),
  };

  const previousPracticeDays = getPracticeDayCount(
    previousMonthSessions,
    previousPeriodDays
  );
  const comparisonPeriodLabel = isCurrentMonth
    ? 'the same period last month'
    : 'the previous month';
  const comparisonText = getPracticeComparison({
    isFutureMonth,
    practiceDays: monthlyStats.practiceDays,
    previousPracticeDays,
    comparisonPeriodLabel,
  });
  
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
        
        {/* Monthly Progress */}
        <View style={styles.statsPanel}>
          <Text style={styles.statsPanelTitle}>Monthly Progress</Text>

          <View style={styles.practiceSummary}>
            <View style={styles.practiceDaysNumberContainer}>
              <Text
                style={styles.practiceDaysNumber}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {monthlyStats.practiceDays}
              </Text>
            </View>
            <View style={styles.practiceDaysCopy}>
              <Text style={styles.practiceDaysLabel}>
                of {availableDays} {availableDays === 1 ? 'day' : 'days'} practiced
              </Text>
              <Text style={styles.comparisonText}>{comparisonText}</Text>
            </View>
          </View>

          <View style={styles.monthlyTotals}>
            <View style={styles.monthlyTotalItem}>
              <Text style={styles.monthlyTotalValue}>{monthlyStats.meditationTime}</Text>
              <Text style={styles.monthlyTotalLabel}>Meditation time</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.monthlyTotalItem}>
              <Text style={styles.monthlyTotalValue}>{monthlyStats.totalSessions}</Text>
              <Text style={styles.monthlyTotalLabel}>Sessions</Text>
            </View>
          </View>

          <View style={styles.sessionBreakdown}>
            <Text style={[styles.sessionBreakdownText, { color: COLORS.morning }]}>
              Morning {monthlyStats.morningCount}
            </Text>
            <View style={styles.breakdownDot} />
            <Text style={[styles.sessionBreakdownText, { color: COLORS.evening }]}>
              Evening {monthlyStats.eveningCount}
            </Text>
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
    marginBottom: 18,
  },
  practiceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  practiceDaysNumberContainer: {
    width: 72,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  practiceDaysNumber: {
    width: '100%',
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  practiceDaysCopy: {
    flex: 1,
    paddingLeft: 10,
  },
  practiceDaysLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  comparisonText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  monthlyTotals: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 20,
  },
  monthlyTotalItem: {
    flex: 1,
  },
  monthlyTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primaryActive,
    marginBottom: 4,
  },
  monthlyTotalLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  totalDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  sessionBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sessionBreakdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 10,
    backgroundColor: COLORS.borderStrong,
  },
});
