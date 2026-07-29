import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { 
  loadSessions, 
  loadAppSettings,
  addSession,
  removeSession,
  saveUserProgress,
  saveAppSettings 
} from '../utils/storage';
import { createMeditationSession, createUserProgress, createAppSettings, SESSION_TYPES } from '../types';
import {
  getIncompleteDayNotificationMessage,
  getRandomNotificationMessage,
  getNotificationTitle,
} from '../utils/notificationMessages';
import {
  configureReminderNotificationActions,
  REMINDER_CATEGORY_ID,
  REMINDER_NOTIFICATION_KIND,
} from '../services/reminderNotificationService';

const REMINDER_PREFIX = 'meditation-reminder-';
const INCOMPLETE_DAY_REMINDER_TYPES = ['evening', 'late-22', 'late-23'];

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasCompletedSessionForDate = (sessions, date) => (
  sessions.some(session => session.date === date && session.completed)
);

// Initial state
const initialState = {
  sessions: [],
  userProgress: createUserProgress(),
  settings: createAppSettings(),
  loading: true,
};

// Action types
const ACTIONS = {
  LOAD_DATA_SUCCESS: 'LOAD_DATA_SUCCESS',
  LOAD_DATA_ERROR: 'LOAD_DATA_ERROR',
  MARK_SESSION_COMPLETE: 'MARK_SESSION_COMPLETE',
  REMOVE_SESSION: 'REMOVE_SESSION',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SET_LOADING: 'SET_LOADING'
};

// Reducer function
const meditationReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.LOAD_DATA_SUCCESS:
      return {
        ...state,
        sessions: action.payload.sessions,
        userProgress: action.payload.progress,
        settings: action.payload.settings,
        loading: false,
      };
    
    case ACTIONS.LOAD_DATA_ERROR:
      return {
        ...state,
        loading: false,
      };
    
    case ACTIONS.MARK_SESSION_COMPLETE:
      const updatedSessions = [...state.sessions];
      const existingIndex = updatedSessions.findIndex(s => s.id === action.payload.id);
      
      if (existingIndex >= 0) {
        updatedSessions[existingIndex] = action.payload;
      } else {
        updatedSessions.push(action.payload);
      }
      
      return {
        ...state,
        sessions: updatedSessions,
      };
    
    case ACTIONS.REMOVE_SESSION:
      return {
        ...state,
        sessions: state.sessions.filter(s => s.id !== action.payload.sessionId),
      };
    
    case ACTIONS.UPDATE_PROGRESS:
      return {
        ...state,
        userProgress: action.payload,
      };
    
    case ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    default:
      return state;
  }
};

// Create context
const MeditationContext = createContext();

// Provider component
export const MeditationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(meditationReducer, initialState);
  const notificationOperationsRef = useRef(Promise.resolve());

  const queueNotificationOperation = (operation) => {
    const queuedOperation = notificationOperationsRef.current.then(operation, operation);
    notificationOperationsRef.current = queuedOperation.catch(() => {});
    return queuedOperation;
  };

  // Load data on app start
  useEffect(() => {
    loadAppData();
  }, []);

  // Initialize notifications when settings are loaded
  useEffect(() => {
    if (!state.loading && state.settings.notificationsEnabled) {
      initializeNotifications();
    }
  }, [
    state.loading,
    state.settings.notificationsEnabled,
    state.settings.morningReminderTime,
    state.settings.eveningReminderTime,
    state.settings.language,
  ]);

  // Listen for app state changes to reschedule notifications when needed
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // Check and reschedule notifications when app becomes active
        checkAndRescheduleNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, [state.settings, state.sessions]);

  const loadAppData = async () => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      const [sessions, settings] = await Promise.all([
        loadSessions(),
        loadAppSettings()
      ]);
      const progress = calculateStreaks(sessions);
      await saveUserProgress(progress);
      
      dispatch({
        type: ACTIONS.LOAD_DATA_SUCCESS,
        payload: { sessions, progress, settings }
      });
    } catch (error) {
      console.error('Error loading app data:', error);
      dispatch({ type: ACTIONS.LOAD_DATA_ERROR });
    }
  };

  const initializeNotifications = async () => {
    if (!Device.isDevice) return;

    try {
      // Check if notifications are enabled and schedule them
      if (state.settings.notificationsEnabled) {
        await scheduleNotifications();
      }
    } catch {}
  };

  const cancelIncompleteDayReminders = (date) => queueNotificationOperation(async () => {
    try {
      await Promise.all(
        INCOMPLETE_DAY_REMINDER_TYPES.map(type => (
          Notifications.cancelScheduledNotificationAsync(`${REMINDER_PREFIX}${type}-${date}`)
        ))
      );
    } catch {}
  });

  const scheduleNotifications = (settingsOverride = null, sessionsOverride = null) => queueNotificationOperation(async () => {
    try {
      // Cancel only daily reminders. Active meditation timer alarms must survive.
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const reminderNotifications = scheduledNotifications.filter(({ identifier }) => (
        identifier.startsWith(REMINDER_PREFIX)
      ));
      await Promise.all(
        reminderNotifications.map(({ identifier }) => (
          Notifications.cancelScheduledNotificationAsync(identifier)
        ))
      );

      const currentSettings = settingsOverride || state.settings;
      const currentSessions = sessionsOverride || state.sessions;
      if (!currentSettings.notificationsEnabled) return;

      await configureReminderNotificationActions();

      const { morningReminderTime, eveningReminderTime } = currentSettings;

      // Schedule multiple notifications for variety (next 30 days)
      const today = new Date();
      const daysToSchedule = 30;

      for (let day = 0; day < daysToSchedule; day++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + day);
        const targetDateString = getLocalDateString(targetDate);
        const meditationAlreadyLogged = hasCompletedSessionForDate(currentSessions, targetDateString);

        // Schedule morning notification
        if (morningReminderTime) {
          const [morningHours, morningMinutes] = morningReminderTime.split(':').map(Number);
          const morningDate = new Date(targetDate);
          morningDate.setHours(morningHours, morningMinutes, 0, 0);

          // Only schedule future notifications
          if (morningDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${REMINDER_PREFIX}morning-${targetDateString}`,
              content: {
                title: getNotificationTitle('morning', currentSettings.language),
                body: getRandomNotificationMessage('morning', currentSettings.language),
                sound: true,
                categoryIdentifier: REMINDER_CATEGORY_ID,
                data: { kind: REMINDER_NOTIFICATION_KIND },
              },
              trigger: {
                type: 'date',
                date: morningDate,
              },
            });
          }
        }

        // Schedule evening notification
        if (eveningReminderTime && !meditationAlreadyLogged) {
          const [eveningHours, eveningMinutes] = eveningReminderTime.split(':').map(Number);
          const eveningDate = new Date(targetDate);
          eveningDate.setHours(eveningHours, eveningMinutes, 0, 0);

          // Only schedule future notifications
          if (eveningDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${REMINDER_PREFIX}evening-${targetDateString}`,
              content: {
                title: getNotificationTitle('evening', currentSettings.language),
                body: getIncompleteDayNotificationMessage('evening', currentSettings.language),
                sound: true,
                categoryIdentifier: REMINDER_CATEGORY_ID,
                data: { kind: REMINDER_NOTIFICATION_KIND },
              },
              trigger: {
                type: 'date',
                date: eveningDate,
              },
            });
          }
        }

        // Add stronger late reminders only while the day has no completed session.
        if (!meditationAlreadyLogged) {
          for (const hour of [22, 23]) {
            const lateReminderDate = new Date(targetDate);
            lateReminderDate.setHours(hour, 0, 0, 0);

            if (lateReminderDate > new Date()) {
              await Notifications.scheduleNotificationAsync({
                identifier: `${REMINDER_PREFIX}late-${hour}-${targetDateString}`,
                content: {
                  title: getNotificationTitle('late', currentSettings.language),
                  body: getIncompleteDayNotificationMessage('late', currentSettings.language),
                  sound: true,
                  categoryIdentifier: REMINDER_CATEGORY_ID,
                  data: { kind: REMINDER_NOTIFICATION_KIND },
                },
                trigger: {
                  type: 'date',
                  date: lateReminderDate,
                },
              });
            }
          }
        }
      }
    } catch {}
  });

  // Check remaining scheduled notifications and reschedule if needed
  const checkAndRescheduleNotifications = async () => {
    try {
      if (!state.settings.notificationsEnabled) return;

      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Filter for our meditation notifications
      const meditationNotifications = scheduledNotifications.filter(notification => 
        notification.identifier.startsWith(REMINDER_PREFIX)
      );

      // Calculate days remaining until the latest notification
      const now = new Date();
      const futureNotifications = meditationNotifications.filter(notification => {
        const triggerDate = new Date(notification.trigger.date);
        return triggerDate > now;
      });

      const latestTriggerTime = futureNotifications.reduce((latest, notification) => {
        const triggerTime = new Date(notification.trigger.date).getTime();
        return Math.max(latest, triggerTime);
      }, 0);
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(now.getDate() + 7);

      // Replenish reminders when the schedule no longer reaches a week ahead.
      if (latestTriggerTime < sevenDaysFromNow.getTime()) {
        await scheduleNotifications();
      }
    } catch {}
  };

  // Calculate streaks from sessions
  const calculateStreaks = (sessions) => {
    if (!sessions.length) return createUserProgress();

    const sortedSessions = sessions
      .filter(session => session.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!sortedSessions.length) return createUserProgress();

    let currentStreak = 0;
    let longestStreak = 0;
    let morningStreak = 0;
    let eveningStreak = 0;
    let totalSessions = sortedSessions.length;
    let lastSessionDate = sortedSessions[0].date;

    // Group sessions by date
    const sessionsByDate = {};
    sortedSessions.forEach(session => {
      if (!sessionsByDate[session.date]) {
        sessionsByDate[session.date] = [];
      }
      sessionsByDate[session.date].push(session);
    });

    // Calculate current streak (consecutive days with at least one session)
    const dates = Object.keys(sessionsByDate).sort((a, b) => new Date(b) - new Date(a));
    const today = new Date().toISOString().split('T')[0];
    let streakBroken = false;
    
    // Check if we should start counting from today or most recent session
    const mostRecentDate = dates[0];
    const daysSinceLastSession = Math.floor((new Date(today) - new Date(mostRecentDate)) / (1000 * 60 * 60 * 24));
    
    // If more than 1 day since last session, streak is broken
    if (daysSinceLastSession > 1) {
      currentStreak = 0;
    } else {
      // Count consecutive days with at least one session
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const dateSessions = sessionsByDate[date];
        const hasAnySession = dateSessions.length > 0;
        
        if (hasAnySession && !streakBroken) {
          currentStreak++;
          
          // Check if next day in sequence
          if (i < dates.length - 1) {
            const currentDate = new Date(date);
            const nextDate = new Date(dates[i + 1]);
            const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
            
            if (dayDiff > 1) {
              streakBroken = true;
            }
          }
        } else {
          streakBroken = true;
        }
      }
    }

    // Calculate longest streak by checking all possible consecutive sequences
    let tempStreak = 0;
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dateSessions = sessionsByDate[date];
      const hasAnySession = dateSessions.length > 0;
      
      if (hasAnySession) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        
        // Check if next day in sequence
        if (i < dates.length - 1) {
          const currentDate = new Date(date);
          const nextDate = new Date(dates[i + 1]);
          const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
          
          if (dayDiff > 1) {
            tempStreak = 0;
          }
        }
      } else {
        tempStreak = 0;
      }
    }

    // Calculate individual streaks
    const morningSessions = sortedSessions.filter(s => s.type === SESSION_TYPES.MORNING);
    const eveningSessions = sortedSessions.filter(s => s.type === SESSION_TYPES.EVENING);
    
    morningStreak = calculateIndividualStreak(morningSessions);
    eveningStreak = calculateIndividualStreak(eveningSessions);

    // Calculate total hours
    const totalMinutes = sortedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places

    return {
      currentStreak,
      longestStreak,
      totalSessions,
      morningStreak,
      eveningStreak,
      lastSessionDate,
      totalHours
    };
  };

  const calculateIndividualStreak = (sessions) => {
    if (!sessions.length) return 0;
    
    const dates = sessions.map(s => s.date).sort((a, b) => new Date(b) - new Date(a));
    let streak = 1;
    
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const previousDate = new Date(dates[i-1]);
      const dayDiff = (previousDate - currentDate) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Mark session as complete
  const markSessionComplete = async (date, type, duration = 0) => {
    try {
      const existingSession = state.sessions.find(s => s.date === date && s.type === type);
      
      const session = existingSession || createMeditationSession(date, type);
      session.completed = true;
      session.completedAt = Date.now();
      session.duration = duration; // Store duration in minutes
      
      // Save to storage
      await addSession(session);
      
      // Update state
      dispatch({
        type: ACTIONS.MARK_SESSION_COMPLETE,
        payload: session
      });
      
      // Mark user as no longer first-time if this is their first completed session
      if (state.settings.isFirstTimeUser) {
        await updateSettings({ isFirstTimeUser: false });
      }
      
      // Recalculate and update progress
      const updatedSessions = [...state.sessions];
      const index = updatedSessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        updatedSessions[index] = session;
      } else {
        updatedSessions.push(session);
      }
      
      const newProgress = calculateStreaks(updatedSessions);
      await saveUserProgress(newProgress);
      
      dispatch({
        type: ACTIONS.UPDATE_PROGRESS,
        payload: newProgress
      });

      await cancelIncompleteDayReminders(date);
      
      return true;
    } catch (error) {
      console.error('Error marking session complete:', error);
      return false;
    }
  };

  const recordTimerSession = async ({ timerId, startedAt, completedAt, duration }) => {
    try {
      const sessionId = `timer_${timerId}`;
      if (state.sessions.some(session => session.id === sessionId)) return true;

      const startedDate = new Date(startedAt);
      const year = startedDate.getFullYear();
      const month = String(startedDate.getMonth() + 1).padStart(2, '0');
      const day = String(startedDate.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      const session = {
        ...createMeditationSession(date, SESSION_TYPES.TIMER),
        id: sessionId,
        completed: true,
        completedAt,
        startedAt,
        period: startedDate.getHours() < 12
          ? SESSION_TYPES.MORNING
          : SESSION_TYPES.EVENING,
        duration,
      };

      const saved = await addSession(session);
      if (!saved) return false;

      dispatch({
        type: ACTIONS.MARK_SESSION_COMPLETE,
        payload: session
      });

      if (state.settings.isFirstTimeUser) {
        await updateSettings({ isFirstTimeUser: false });
      }

      const updatedSessions = [...state.sessions];
      const index = updatedSessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        updatedSessions[index] = session;
      } else {
        updatedSessions.push(session);
      }

      const newProgress = calculateStreaks(updatedSessions);
      const progressSaved = await saveUserProgress(newProgress);
      if (!progressSaved) return false;

      dispatch({
        type: ACTIONS.UPDATE_PROGRESS,
        payload: newProgress
      });

      await cancelIncompleteDayReminders(date);

      return true;
    } catch (error) {
      console.error('Error recording timer session:', error);
      return false;
    }
  };

  // Get today's sessions
  const getTodaysSessions = () => {
    const today = new Date().toISOString().split('T')[0];
    return state.sessions.filter(session => session.date === today);
  };

  // Get session for specific date and type
  const getSession = (date, type) => {
    return state.sessions.find(session => session.date === date && session.type === type);
  };

  // Remove session
  const removeSessionComplete = async (date, type, sessionId = null) => {
    try {
      const sessionToRemove = sessionId
        ? state.sessions.find(session => session.id === sessionId)
        : state.sessions.find(session => session.date === date && session.type === type);
      
      if (!sessionToRemove) {
        console.log('Session not found for removal:', { date, type, sessionId });
        return false;
      }
      
      // Remove from storage using the actual session ID
      await removeSession(sessionToRemove.id);
      
      // Update state
      dispatch({
        type: ACTIONS.REMOVE_SESSION,
        payload: { sessionId: sessionToRemove.id }
      });
      
      // Recalculate and update progress
      const updatedSessions = state.sessions.filter(s => s.id !== sessionToRemove.id);
      const newProgress = calculateStreaks(updatedSessions);
      await saveUserProgress(newProgress);
      
      dispatch({
        type: ACTIONS.UPDATE_PROGRESS,
        payload: newProgress
      });

      await scheduleNotifications(null, updatedSessions);
      
      console.log('Session removed successfully:', sessionToRemove.id);
      return true;
    } catch (error) {
      console.error('Error removing session:', error);
      return false;
    }
  };

  // Update app settings
  const updateSettings = async (newSettings) => {
    try {
      const updatedSettings = { ...state.settings, ...newSettings };
      await saveAppSettings(updatedSettings);
      dispatch({
        type: ACTIONS.UPDATE_SETTINGS,
        payload: newSettings
      });

      // Reschedule notifications if notification-related settings changed
      if (newSettings.hasOwnProperty('notificationsEnabled') || 
          newSettings.hasOwnProperty('morningReminderTime') || 
          newSettings.hasOwnProperty('eveningReminderTime') ||
          newSettings.hasOwnProperty('language')) {
        await scheduleNotifications(updatedSettings);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  const value = {
    // State
    sessions: state.sessions,
    userProgress: state.userProgress,
    settings: state.settings,
    loading: state.loading,
    
    // Actions
    markSessionComplete,
    recordTimerSession,
    removeSessionComplete,
    updateSettings,
    getTodaysSessions,
    getSession,
    loadAppData,
    scheduleNotifications,
    checkAndRescheduleNotifications,
  };

  return (
    <MeditationContext.Provider value={value}>
      {children}
    </MeditationContext.Provider>
  );
};

// Custom hook to use the context
export const useMeditation = () => {
  const context = useContext(MeditationContext);
  if (!context) {
    throw new Error('useMeditation must be used within a MeditationProvider');
  }
  return context;
};
