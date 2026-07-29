import React, { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { MeditationProvider, useMeditation } from './src/context/MeditationContext';
import { ModalProvider } from './src/context/ModalContext';
import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import TimerScreen from './src/screens/TimerScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import BackupScreen from './src/screens/BackupScreen';
import RootModalManager from './src/components/RootModalManager';
import { BackupService } from './src/services/backupService';
import { COLORS } from './src/theme/colors';
import {
  REMINDER_NOTIFICATION_KIND,
  REMINDER_START_ACTION_ID,
  REMINDER_START_DURATION_MINUTES,
} from './src/services/reminderNotificationService';

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();
let pendingTimerStart = null;

const openTimerFromNotification = (timerStart) => {
  if (!navigationRef.isReady()) {
    pendingTimerStart = timerStart;
    return;
  }

  navigationRef.navigate('Timer', {
    notificationStartRequestId: timerStart.requestId,
    notificationStartDuration: REMINDER_START_DURATION_MINUTES,
  });
  pendingTimerStart = null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationResponseManager = () => {
  const handledResponsesRef = useRef(new Set());

  useEffect(() => {
    const handleResponse = (response) => {
      if (
        !response
        || response.actionIdentifier !== REMINDER_START_ACTION_ID
        || response.notification.request.content.data?.kind !== REMINDER_NOTIFICATION_KIND
      ) {
        return;
      }

      const requestId = response.notification.request.identifier;
      const responseKey = `${requestId}:${response.actionIdentifier}`;
      if (handledResponsesRef.current.has(responseKey)) return;

      handledResponsesRef.current.add(responseKey);
      openTimerFromNotification({ requestId });
      Notifications.clearLastNotificationResponseAsync().catch(error => {
        console.error('Error clearing handled notification response:', error);
      });
    };

    Notifications.getLastNotificationResponseAsync()
      .then(handleResponse)
      .catch(error => {
        console.error('Error reading initial notification response:', error);
      });
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => subscription.remove();
  }, []);

  return null;
};

const AutomaticBackupManager = () => {
  const { loading } = useMeditation();
  const appState = useRef(AppState.currentState);
  const backupInProgress = useRef(false);

  const attemptAutomaticBackup = useCallback(async () => {
    if (backupInProgress.current) return;

    backupInProgress.current = true;
    try {
      const result = await BackupService.runAutomaticBackup();
      if (!result.success) {
        console.warn('Automatic backup will retry the next time the app opens:', result.error);
      }
    } finally {
      backupInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      attemptAutomaticBackup();
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (!loading && appState.current !== 'active' && nextAppState === 'active') {
        attemptAutomaticBackup();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [attemptAutomaticBackup, loading]);

  return null;
};

export default function App() {
  return (
    <MeditationProvider>
      <AutomaticBackupManager />
      <NotificationResponseManager />
      <ModalProvider>
        <>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              if (pendingTimerStart) openTimerFromNotification(pendingTimerStart);
            }}
          >
            <StatusBar style="light" />
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName;

                  if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                  } else if (route.name === 'Progress') {
                    iconName = focused ? 'calendar' : 'calendar-outline';
                  } else if (route.name === 'Timer') {
                    iconName = focused ? 'timer' : 'timer-outline';
                  } else if (route.name === 'Notifications') {
                    iconName = focused ? 'notifications' : 'notifications-outline';
                  } else if (route.name === 'Backup') {
                    iconName = focused ? 'cloud' : 'cloud-outline';
                  }

                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primaryActive,
                tabBarInactiveTintColor: COLORS.textSubtle,
                tabBarStyle: {
                  backgroundColor: COLORS.surface,
                  borderTopColor: COLORS.border,
                },
                headerStyle: {
                  backgroundColor: COLORS.primary,
                },
                headerTintColor: COLORS.surface,
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              })}
            >
              <Tab.Screen 
                name="Home" 
                component={HomeScreen}
                options={{
                  title: 'Meditation Tracker',
                  tabBarLabel: 'Today',
                }}
              />
              <Tab.Screen 
                name="Progress" 
                component={ProgressScreen}
                options={{
                  title: 'Your Progress',
                  tabBarLabel: 'Progress',
                }}
              />
              <Tab.Screen
                name="Timer"
                component={TimerScreen}
                options={{
                  title: 'Meditation Timer',
                  tabBarLabel: 'Timer',
                }}
              />
              <Tab.Screen 
                name="Notifications" 
                component={NotificationScreen}
                options={{
                  title: 'Notifications',
                  tabBarLabel: 'Reminders',
                }}
              />
              <Tab.Screen 
                name="Backup" 
                component={BackupScreen}
                options={{
                  title: 'Backup & Sync',
                  tabBarLabel: 'Backup',
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <RootModalManager />
        </>
      </ModalProvider>
    </MeditationProvider>
  );
}
