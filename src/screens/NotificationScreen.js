import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMeditation } from '../context/MeditationContext';
import { getRandomNotificationMessage, getNotificationTitle } from '../utils/notificationMessages';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function NotificationScreen() {
  const { settings, updateSettings } = useMeditation();
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [morningTime, setMorningTime] = useState(new Date());
  const [eveningTime, setEveningTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);

  useEffect(() => {
    // Convert time strings to Date objects
    if (settings.morningReminderTime) {
      const [hours, minutes] = settings.morningReminderTime.split(':').map(Number);
      const morning = new Date();
      morning.setHours(hours, minutes, 0, 0);
      setMorningTime(morning);
    }

    if (settings.eveningReminderTime) {
      const [hours, minutes] = settings.eveningReminderTime.split(':').map(Number);
      const evening = new Date();
      evening.setHours(hours, minutes, 0, 0);
      setEveningTime(evening);
    }

    setNotificationsEnabled(settings.notificationsEnabled);
  }, [settings]);

  const requestPermissions = async () => {
    if (!Device.isDevice) {
      Alert.alert('Error', 'Push notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive meditation reminders.'
      );
      return false;
    }

    return true;
  };

  const scheduleNotification = async (time, type) => {
    // Cancel existing notifications for this type
    const today = new Date();
    for (let day = 0; day < 30; day++) {
      await Notifications.cancelScheduledNotificationAsync(`meditation-reminder-${type}-${day}`);
    }

    if (!notificationsEnabled) return;

    // Schedule multiple notifications for variety (next 30 days)
    const daysToSchedule = 30;

    for (let day = 0; day < daysToSchedule; day++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + day);
      targetDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

      // Only schedule future notifications
      if (targetDate > new Date()) {
        const title = getNotificationTitle(type, settings.language);
        const body = getRandomNotificationMessage(type, settings.language);

        await Notifications.scheduleNotificationAsync({
          identifier: `meditation-reminder-${type}-${day}`,
          content: {
            title,
            body,
            sound: true,
          },
          trigger: {
            type: 'date',
            date: targetDate,
          },
        });
      }
    }
  };

  const handleNotificationToggle = async (enabled) => {
    if (enabled) {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return;
      }
    }

    setNotificationsEnabled(enabled);
    
    // Update settings
    await updateSettings({ notificationsEnabled: enabled });

    if (enabled) {
      // Schedule both notifications
      await scheduleNotification(morningTime, 'morning');
      await scheduleNotification(eveningTime, 'evening');
    } else {
      // Cancel all notifications
      for (let day = 0; day < 30; day++) {
        await Notifications.cancelScheduledNotificationAsync(`meditation-reminder-morning-${day}`);
        await Notifications.cancelScheduledNotificationAsync(`meditation-reminder-evening-${day}`);
      }
    }
  };

  const handleTimeChange = async (type, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowMorningPicker(false);
      setShowEveningPicker(false);
    }

    if (!selectedTime) return;

    const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;
    
    if (type === 'morning') {
      setMorningTime(selectedTime);
      await updateSettings({ morningReminderTime: timeString });
      if (notificationsEnabled) {
        await scheduleNotification(selectedTime, 'morning');
      }
    } else {
      setEveningTime(selectedTime);
      await updateSettings({ eveningReminderTime: timeString });
      if (notificationsEnabled) {
        await scheduleNotification(selectedTime, 'evening');
      }
    }
  };

  const handleLanguageChange = async (language) => {
    await updateSettings({ language });
    setShowLanguagePicker(false);
    
    // Reschedule notifications with new language if enabled
    if (notificationsEnabled) {
      await scheduleNotification(morningTime, 'morning');
      await scheduleNotification(eveningTime, 'evening');
    }
  };

  const getLanguageDisplayName = (language) => {
    return language === 'hindi' ? 'हिंदी' : 'English';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Meditation Reminders</Text>
      <Text style={styles.subtitle}>
        Set daily reminders for your meditation practice
      </Text>

      {/* Notifications Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Text style={styles.settingDescription}>
            Receive daily reminders for your meditation sessions
          </Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: '#767577', true: '#4A90E2' }}
          thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {/* Morning Reminder */}
      <View style={[styles.settingRow, !notificationsEnabled && styles.disabled]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, !notificationsEnabled && styles.disabledText]}>
            Morning Meditation
          </Text>
          <Text style={[styles.settingDescription, !notificationsEnabled && styles.disabledText]}>
            Daily reminder for morning practice
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.timeButton, !notificationsEnabled && styles.disabledButton]}
          onPress={() => notificationsEnabled && setShowMorningPicker(true)}
          disabled={!notificationsEnabled}
        >
          <Text style={[styles.timeText, !notificationsEnabled && styles.disabledText]}>
            {formatTime(morningTime)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Evening Reminder */}
      <View style={[styles.settingRow, !notificationsEnabled && styles.disabled]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, !notificationsEnabled && styles.disabledText]}>
            Evening Meditation
          </Text>
          <Text style={[styles.settingDescription, !notificationsEnabled && styles.disabledText]}>
            Daily reminder for evening practice
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.timeButton, !notificationsEnabled && styles.disabledButton]}
          onPress={() => notificationsEnabled && setShowEveningPicker(true)}
          disabled={!notificationsEnabled}
        >
          <Text style={[styles.timeText, !notificationsEnabled && styles.disabledText]}>
            {formatTime(eveningTime)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language Selection */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Quote Language</Text>
          <Text style={styles.settingDescription}>
            Choose language for meditation quotes and notifications
          </Text>
        </View>
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguagePicker(true)}
        >
          <Text style={styles.languageText}>
            {getLanguageDisplayName(settings.language)}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* iOS Time Pickers */}
      {Platform.OS === 'ios' && (
        <>
          {showMorningPicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowMorningPicker(false)}>
                      <Text style={styles.pickerButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Morning Reminder</Text>
                    <TouchableOpacity onPress={() => setShowMorningPicker(false)}>
                      <Text style={styles.pickerButton}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={morningTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => handleTimeChange('morning', selectedTime)}
                  />
                </View>
              </View>
            </Modal>
          )}

          {showEveningPicker && (
            <Modal transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowEveningPicker(false)}>
                      <Text style={styles.pickerButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Evening Reminder</Text>
                    <TouchableOpacity onPress={() => setShowEveningPicker(false)}>
                      <Text style={styles.pickerButton}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={eveningTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => handleTimeChange('evening', selectedTime)}
                  />
                </View>
              </View>
            </Modal>
          )}
        </>
      )}

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                  <Text style={styles.pickerButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Language</Text>
                <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                  <Text style={styles.pickerButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.languageOptions}>
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    settings.language === 'english' && styles.selectedLanguageOption,
                  ]}
                  onPress={() => handleLanguageChange('english')}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      settings.language === 'english' && styles.selectedLanguageOptionText,
                    ]}
                  >
                    English
                  </Text>
                  {settings.language === 'english' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    settings.language === 'hindi' && styles.selectedLanguageOption,
                  ]}
                  onPress={() => handleLanguageChange('hindi')}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      settings.language === 'hindi' && styles.selectedLanguageOptionText,
                    ]}
                  >
                    हिंदी (Hindi)
                  </Text>
                  {settings.language === 'hindi' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android Time Pickers */}
      {Platform.OS === 'android' && showMorningPicker && (
        <DateTimePicker
          value={morningTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => handleTimeChange('morning', selectedTime)}
        />
      )}

      {Platform.OS === 'android' && showEveningPicker && (
        <DateTimePicker
          value={eveningTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => handleTimeChange('evening', selectedTime)}
        />
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🧘‍♂️ About Your Reminders</Text>
        <Text style={styles.infoText}>
          • Each notification features inspiring Vipassana wisdom{'\n'}
          • Messages rotate daily with teachings on anicca, samata, adhiṣṭhāna{'\n'}
          • Morning messages focus on determination and presence{'\n'}
          • Evening messages emphasize equanimity and letting go{'\n'}
          • Notifications scheduled for the next 30 days with variety
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 Practice Tips</Text>
        <Text style={styles.infoText}>
          • Choose times when you're most likely to be available{'\n'}
          • Morning sessions help set a positive tone for the day{'\n'}
          • Evening sessions help you unwind and reflect{'\n'}
          • You can always adjust these times later
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  settingRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  timeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  timeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#bdc3c7',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  pickerButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  languageButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownArrow: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 8,
  },
  languageOptions: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedLanguageOption: {
    backgroundColor: '#e8f4fd',
  },
  languageOptionText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '500',
  },
  selectedLanguageOptionText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});