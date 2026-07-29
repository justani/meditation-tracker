import React, { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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

const Tab = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
      <ModalProvider>
        <>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor={COLORS.primary} />
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
