import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserProgress, createAppSettings } from '../types';

// Storage keys
const KEYS = {
  SESSIONS: 'meditation_sessions',
  PROGRESS: 'user_progress',
  SETTINGS: 'app_settings'
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
    return jsonValue != null ? JSON.parse(jsonValue) : createAppSettings();
  } catch (error) {
    console.error('Error loading app settings:', error);
    return createAppSettings();
  }
};

// Data Management
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([KEYS.SESSIONS, KEYS.PROGRESS, KEYS.SETTINGS]);
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