import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { MeditationProvider } from './src/context/MeditationContext';
import { ModalProvider } from './src/context/ModalContext';
import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import BackupScreen from './src/screens/BackupScreen';
import RootModalManager from './src/components/RootModalManager';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <MeditationProvider>
      <ModalProvider>
        <>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName;

                  if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                  } else if (route.name === 'Progress') {
                    iconName = focused ? 'calendar' : 'calendar-outline';
                  } else if (route.name === 'Notifications') {
                    iconName = focused ? 'notifications' : 'notifications-outline';
                  } else if (route.name === 'Backup') {
                    iconName = focused ? 'cloud' : 'cloud-outline';
                  }

                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#4A90E2',
                tabBarInactiveTintColor: 'gray',
                headerStyle: {
                  backgroundColor: '#4A90E2',
                },
                headerTintColor: '#fff',
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
                }}
              />
              <Tab.Screen 
                name="Progress" 
                component={ProgressScreen}
                options={{
                  title: 'Your Progress',
                }}
              />
              <Tab.Screen 
                name="Notifications" 
                component={NotificationScreen}
                options={{
                  title: 'Notifications',
                }}
              />
              <Tab.Screen 
                name="Backup" 
                component={BackupScreen}
                options={{
                  title: 'Backup & Sync',
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
