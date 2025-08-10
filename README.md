# Meditation Habit Tracker

A React Native meditation habit tracking app built with Expo, designed specifically for vipassana meditation practice. The app tracks morning and evening meditation sessions using an intuitive long-press interaction pattern and provides streak calculation and progress visualization.

## Features

- 🧘‍♀️ **Daily Session Tracking**: Track morning and evening meditation sessions separately
- 🎯 **Long-Press Interaction**: Intuitive 800ms long-press to mark sessions complete
- 📊 **Progress Visualization**: Calendar view with visual progress indicators
- 🔥 **Streak Calculation**: Track consecutive days and individual session streaks
- ⏰ **Flexible Duration Tracking**: Record meditation session lengths
- 📱 **Haptic Feedback**: Tactile feedback for session completion
- 💾 **Local Data Storage**: All data stored locally with AsyncStorage
- 🌐 **Google Drive Backup**: Backup and restore meditation data to Google Drive
- 📈 **Statistics**: View detailed progress and session history

## Installation

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development) or Xcode (for iOS development)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd meditation-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or
expo start
```

4. Run on your preferred platform:
```bash
npm run android  # Run on Android
npm run ios      # Run on iOS (macOS only)  
npm run web      # Run in web browser
```

## Project Structure

```
meditation-tracker/
├── App.js                          # Main app with navigation setup
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── MeditationCircle.js      # Interactive meditation tracking circles
│   │   ├── MeditationCircleSimple.js # Simplified circle component
│   │   ├── DurationPickerModal.js   # Time duration selector
│   │   └── MergePreviewModal.js     # Data merge preview interface
│   ├── context/
│   │   └── MeditationContext.js     # Global state management with reducer
│   ├── screens/                     # App screens
│   │   ├── HomeScreen.js            # Main tracking interface
│   │   ├── ProgressScreen.js        # Calendar and statistics view
│   │   ├── BackupScreen.js          # Google Drive backup interface
│   │   └── NotificationScreen.js    # Notification settings
│   ├── services/                    # External service integrations
│   │   ├── backupService.js         # Backup/restore operations
│   │   ├── dataMergeService.js      # Smart data merging logic
│   │   ├── googleAuth.js            # Google authentication
│   │   └── googleDrive.js           # Google Drive API integration
│   ├── types/
│   │   └── index.js                 # Data models and type definitions
│   └── utils/                       # Utility functions
│       ├── dateHelpers.js           # Date manipulation utilities
│       ├── storage.js               # AsyncStorage persistence layer
│       └── notificationMessages.js # Notification content
```

## Key Technologies

- **Expo SDK ~53.0.20** - React Native framework
- **React Navigation** - Bottom tab navigation
- **React Native Reanimated** - Smooth animations
- **AsyncStorage** - Local data persistence
- **Expo Haptics** - Tactile feedback
- **Google Drive API** - Cloud backup functionality

## Data Architecture

### Core Data Models
- **MeditationSession**: Individual session records with date, type (morning/evening), completion status, and duration
- **UserProgress**: Calculated streak metrics and session counts  
- **AppSettings**: User preferences and notification settings

### State Management
The app uses React Context with useReducer for centralized state management:
- All session data and progress calculations handled in MeditationContext
- Actions: `MARK_SESSION_COMPLETE`, `REMOVE_SESSION`, `UPDATE_PROGRESS`
- Async operations with proper error handling

### Data Persistence
- Local storage using AsyncStorage
- Google Drive backup with smart data merging
- Automatic conflict resolution for data synchronization

## Development

### Key Implementation Patterns

- **Session Management**: Sessions uniquely identified by `${date}_${type}_${timestamp}`
- **Animation Timing**: 800ms long press, spring animations with damping: 15
- **Date Handling**: All dates in YYYY-MM-DD format, timezone-aware calculations
- **Error Handling**: Try/catch wrapping with graceful degradation

### Development Guidelines

- Use MeditationContext for all state updates
- Use utility functions from storage.js for data operations
- Follow existing animation patterns and timing
- Maintain separation between presentation and business logic

### Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator
npm run web        # Run in web browser
```

## License

This project is private and not licensed for public use.

## Contributing

This is a personal project and not currently accepting contributions.