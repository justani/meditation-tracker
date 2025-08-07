import React, { createContext, useContext, useReducer, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { 
  loadSessions, 
  loadUserProgress, 
  loadAppSettings,
  addSession,
  removeSession,
  saveUserProgress,
  saveAppSettings 
} from '../utils/storage';
import { createMeditationSession, createUserProgress, createAppSettings, SESSION_TYPES } from '../types';
import { getRandomNotificationMessage, getNotificationTitle } from '../utils/notificationMessages';

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

  // Load data on app start
  useEffect(() => {
    loadAppData();
  }, []);

  // Initialize notifications when settings are loaded
  useEffect(() => {
    if (!state.loading && state.settings.notificationsEnabled) {
      initializeNotifications();
    }
  }, [state.loading, state.settings]);

  const loadAppData = async () => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      
      const [sessions, progress, settings] = await Promise.all([
        loadSessions(),
        loadUserProgress(),
        loadAppSettings()
      ]);
      
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
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Check if notifications are enabled and schedule them
      if (state.settings.notificationsEnabled) {
        await scheduleNotifications();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const scheduleNotifications = async (settingsOverride = null) => {
    try {
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const currentSettings = settingsOverride || state.settings;
      if (!currentSettings.notificationsEnabled) return;

      const { morningReminderTime, eveningReminderTime } = currentSettings;

      // Schedule multiple notifications for variety (next 30 days)
      const today = new Date();
      const daysToSchedule = 30;

      for (let day = 0; day < daysToSchedule; day++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + day);

        // Schedule morning notification
        if (morningReminderTime) {
          const [morningHours, morningMinutes] = morningReminderTime.split(':').map(Number);
          const morningDate = new Date(targetDate);
          morningDate.setHours(morningHours, morningMinutes, 0, 0);

          // Only schedule future notifications
          if (morningDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
              identifier: `meditation-reminder-morning-${day}`,
              content: {
                title: getNotificationTitle('morning'),
                body: getRandomNotificationMessage('morning'),
                sound: true,
              },
              trigger: {
                type: 'date',
                date: morningDate,
              },
            });
          }
        }

        // Schedule evening notification
        if (eveningReminderTime) {
          const [eveningHours, eveningMinutes] = eveningReminderTime.split(':').map(Number);
          const eveningDate = new Date(targetDate);
          eveningDate.setHours(eveningHours, eveningMinutes, 0, 0);

          // Only schedule future notifications
          if (eveningDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
              identifier: `meditation-reminder-evening-${day}`,
              content: {
                title: getNotificationTitle('evening'),
                body: getRandomNotificationMessage('evening'),
                sound: true,
              },
              trigger: {
                type: 'date',
                date: eveningDate,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
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

    return {
      currentStreak,
      longestStreak,
      totalSessions,
      morningStreak,
      eveningStreak,
      lastSessionDate
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
  const markSessionComplete = async (date, type) => {
    try {
      const sessionId = `${date}_${type}`;
      const existingSession = state.sessions.find(s => s.date === date && s.type === type);
      
      const session = existingSession || createMeditationSession(date, type);
      session.completed = true;
      session.completedAt = Date.now();
      
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
      
      return true;
    } catch (error) {
      console.error('Error marking session complete:', error);
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
  const removeSessionComplete = async (date, type) => {
    try {
      const sessionToRemove = state.sessions.find(s => s.date === date && s.type === type);
      
      if (!sessionToRemove) {
        console.log('Session not found for removal:', { date, type });
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
          newSettings.hasOwnProperty('eveningReminderTime')) {
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
    removeSessionComplete,
    updateSettings,
    getTodaysSessions,
    getSession,
    loadAppData,
    scheduleNotifications,
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