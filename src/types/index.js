// Data models for the Meditation Habit Tracker app

// MeditationSession interface
export const MeditationSessionType = {
  id: 'string',
  date: 'string', // YYYY-MM-DD format
  type: 'string', // 'morning' | 'evening'
  completed: 'boolean',
  completedAt: 'number', // timestamp
  duration: 'number' // in minutes (optional for future)
};

// UserProgress interface
export const UserProgressType = {
  currentStreak: 'number',
  longestStreak: 'number',
  totalSessions: 'number',
  morningStreak: 'number',
  eveningStreak: 'number',
  lastSessionDate: 'string'
};

// AppSettings interface
export const AppSettingsType = {
  morningReminderTime: 'string', // HH:MM format
  eveningReminderTime: 'string', // HH:MM format
  notificationsEnabled: 'boolean',
  theme: 'string' // 'light' | 'dark' | 'auto'
};

// Session types
export const SESSION_TYPES = {
  MORNING: 'morning',
  EVENING: 'evening'
};

// Helper functions for type checking
export const createMeditationSession = (date, type) => ({
  id: `${date}_${type}_${Date.now()}`,
  date,
  type,
  completed: false,
  completedAt: null,
  duration: 0
});

export const createUserProgress = () => ({
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  morningStreak: 0,
  eveningStreak: 0,
  lastSessionDate: null
});

export const createAppSettings = () => ({
  morningReminderTime: '07:00',
  eveningReminderTime: '19:00',
  notificationsEnabled: false,
  theme: 'auto',
  isFirstTimeUser: true
});