import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserProgress, createAppSettings } from '../types';

// Storage keys
const KEYS = {
  SESSIONS: 'meditation_sessions',
  PROGRESS: 'user_progress',
  SETTINGS: 'app_settings',
  BACKUP_STATE: 'backup_state',
  WIDGET_SUGGESTION_STATE: 'widget_suggestion_state',
  LEGACY_WIDGET_SUGGESTION_DISMISSED: 'widget_suggestion_dismissed'
};

const DEFAULT_BACKUP_STATE = {
  lastSuccessfulBackupAt: null,
  lastContentSignature: null
};

// Meditation Sessions
export const saveSessions = async (sessions) => {
  try {
    const jsonValue = JSON.stringify(sessions);
    await AsyncStorage.setItem(KEYS.SESSIONS, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving sessions:', error);
    return false;
  }
};

export const loadSessions = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.SESSIONS);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

export const addSession = async (session) => {
  try {
    const sessions = await loadSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    return await saveSessions(sessions);
  } catch (error) {
    console.error('Error adding session:', error);
    return false;
  }
};

export const getSessionsForDate = async (date) => {
  try {
    const sessions = await loadSessions();
    return sessions.filter(session => session.date === date);
  } catch (error) {
    console.error('Error getting sessions for date:', error);
    return [];
  }
};

export const removeSession = async (sessionId) => {
  try {
    const sessions = await loadSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    return await saveSessions(filteredSessions);
  } catch (error) {
    console.error('Error removing session:', error);
    return false;
  }
};

// User Progress
export const saveUserProgress = async (progress) => {
  try {
    const jsonValue = JSON.stringify(progress);
    await AsyncStorage.setItem(KEYS.PROGRESS, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving user progress:', error);
    return false;
  }
};

export const loadUserProgress = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.PROGRESS);
    return jsonValue != null ? JSON.parse(jsonValue) : createUserProgress();
  } catch (error) {
    console.error('Error loading user progress:', error);
    return createUserProgress();
  }
};

// App Settings
export const saveAppSettings = async (settings) => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(KEYS.SETTINGS, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving app settings:', error);
    return false;
  }
};

export const loadAppSettings = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (jsonValue == null) return createAppSettings();

    const storedSettings = JSON.parse(jsonValue);
    return {
      ...createAppSettings(),
      ...storedSettings,
      // Existing installations already expressed a quote-language preference.
      // Preserve it without interrupting them with the new-install chooser.
      languageSelectionCompleted: storedSettings.languageSelectionCompleted ?? true,
    };
  } catch (error) {
    console.error('Error loading app settings:', error);
    return createAppSettings();
  }
};

const DEFAULT_WIDGET_SUGGESTION_STATE = {
  promptActionCount: 0,
  completionCount: 0,
  lastActionCompletionCount: null,
};

// Widget discovery is device-specific and should not follow users through backups.
export const loadWidgetSuggestionState = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.WIDGET_SUGGESTION_STATE);
    if (jsonValue != null) {
      const storedState = JSON.parse(jsonValue);
      return {
        ...DEFAULT_WIDGET_SUGGESTION_STATE,
        ...storedState,
        // Earlier drafts used the mutable lifetime-session total. Start a
        // fresh monotonic baseline so only future completions count.
        lastActionCompletionCount: storedState.lastActionCompletionCount
          ?? (storedState.promptActionCount === 1 ? 0 : null),
      };
    }

    // Preserve the intent of the earlier boolean format while still allowing
    // the new single follow-up prompt ten sessions from this upgrade.
    const legacyDismissed = await AsyncStorage.getItem(
      KEYS.LEGACY_WIDGET_SUGGESTION_DISMISSED
    );
    if (legacyDismissed === 'true') {
      const migratedState = {
        promptActionCount: 1,
        completionCount: 0,
        lastActionCompletionCount: 0,
      };
      await AsyncStorage.setItem(
        KEYS.WIDGET_SUGGESTION_STATE,
        JSON.stringify(migratedState)
      );
      return migratedState;
    }

    return { ...DEFAULT_WIDGET_SUGGESTION_STATE };
  } catch (error) {
    console.error('Error loading widget suggestion state:', error);
    return { ...DEFAULT_WIDGET_SUGGESTION_STATE };
  }
};

export const recordWidgetSuggestionAction = async () => {
  try {
    const currentState = await loadWidgetSuggestionState();
    const nextState = {
      ...currentState,
      promptActionCount: Math.min(currentState.promptActionCount + 1, 2),
      lastActionCompletionCount: currentState.completionCount,
    };
    await AsyncStorage.setItem(
      KEYS.WIDGET_SUGGESTION_STATE,
      JSON.stringify(nextState)
    );
    return true;
  } catch (error) {
    console.error('Error saving widget suggestion state:', error);
    return false;
  }
};

export const recordWidgetSessionCompletion = async () => {
  try {
    const currentState = await loadWidgetSuggestionState();
    if (currentState.promptActionCount >= 2) return true;

    const nextState = {
      ...currentState,
      completionCount: currentState.completionCount + 1,
    };
    await AsyncStorage.setItem(
      KEYS.WIDGET_SUGGESTION_STATE,
      JSON.stringify(nextState)
    );
    return true;
  } catch (error) {
    console.error('Error saving widget session completion:', error);
    return false;
  }
};

export const completeWidgetSuggestion = async () => {
  try {
    const currentState = await loadWidgetSuggestionState();
    if (
      currentState.promptActionCount >= 2
      && currentState.lastActionCompletionCount === null
    ) {
      return true;
    }

    await AsyncStorage.setItem(
      KEYS.WIDGET_SUGGESTION_STATE,
      JSON.stringify({
        ...currentState,
        promptActionCount: 2,
        lastActionCompletionCount: null,
      })
    );
    return true;
  } catch (error) {
    console.error('Error completing widget suggestion state:', error);
    return false;
  }
};

// Backup Metadata
export const saveBackupState = async (backupState) => {
  try {
    await AsyncStorage.setItem(KEYS.BACKUP_STATE, JSON.stringify(backupState));
    return true;
  } catch (error) {
    console.error('Error saving backup state:', error);
    return false;
  }
};

export const loadBackupState = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.BACKUP_STATE);
    return jsonValue != null
      ? { ...DEFAULT_BACKUP_STATE, ...JSON.parse(jsonValue) }
      : { ...DEFAULT_BACKUP_STATE };
  } catch (error) {
    console.error('Error loading backup state:', error);
    return { ...DEFAULT_BACKUP_STATE };
  }
};

export const clearBackupState = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.BACKUP_STATE);
    return true;
  } catch (error) {
    console.error('Error clearing backup state:', error);
    return false;
  }
};

// Data Management
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.SESSIONS,
      KEYS.PROGRESS,
      KEYS.SETTINGS,
      KEYS.WIDGET_SUGGESTION_STATE,
      KEYS.LEGACY_WIDGET_SUGGESTION_DISMISSED,
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

export const exportData = async () => {
  try {
    const sessions = await loadSessions();
    const progress = await loadUserProgress();
    const settings = await loadAppSettings();
    
    return {
      sessions,
      progress,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
};

export const importData = async (data) => {
  try {
    if (data.sessions) await saveSessions(data.sessions);
    if (data.progress) await saveUserProgress(data.progress);
    if (data.settings) await saveAppSettings(data.settings);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};

export const saveAllData = async (data) => {
  try {
    const { sessions, progress, settings } = data;
    
    await Promise.all([
      sessions ? saveSessions(sessions) : Promise.resolve(),
      progress ? saveUserProgress(progress) : Promise.resolve(),
      settings ? saveAppSettings(settings) : Promise.resolve()
    ]);
    
    return true;
  } catch (error) {
    console.error('Error saving all data:', error);
    return false;
  }
};
