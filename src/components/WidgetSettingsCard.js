import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from '../hooks/useTranslation';
import { MeditationWidgetService } from '../services/meditationWidgetService';
import { COLORS } from '../theme/colors';

const MANUAL_INSTRUCTIONS = 'Touch and hold an empty area on your home screen, choose Widgets, then select Meditation Tracker.';

export default function WidgetSettingsCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await MeditationWidgetService.getStatus());
    } catch {
      setStatus({
        available: false,
        added: false,
        everAdded: false,
        canRequestPin: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') refreshStatus();
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  const handleAdd = async () => {
    if (!status?.canRequestPin) {
      Alert.alert(t('Add home-screen widget'), t(MANUAL_INSTRUCTIONS));
      return;
    }

    setRequesting(true);
    try {
      const opened = await MeditationWidgetService.requestPin();
      if (!opened) {
        Alert.alert(t('Could not add widget'), t(MANUAL_INSTRUCTIONS));
      }
    } catch {
      Alert.alert(t('Could not add widget'), t(MANUAL_INSTRUCTIONS));
    } finally {
      setRequesting(false);
    }
  };

  if (!status?.available) return null;

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Ionicons name="apps" size={22} color={COLORS.primaryInk} />
        <Text style={styles.sectionTitle}>{t('Home-screen widget')}</Text>
      </View>
      <Text style={styles.sectionDescription}>
        {t('See your streak, daily teaching, and today’s progress without opening the app.')}
      </Text>

      {status.added ? (
        <View style={styles.addedStatus}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.addedStatusText}>{t('Widget added')}</Text>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={requesting}
          onPress={handleAdd}
          style={[styles.primaryButton, requesting && styles.disabledButton]}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.onPrimary} />
          <Text style={styles.buttonText}>
            {t(status.canRequestPin ? 'Add widget' : 'How to add widget')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 52,
    backgroundColor: COLORS.primaryActive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  buttonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  addedStatus: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    gap: 8,
    backgroundColor: COLORS.primarySoft,
  },
  addedStatusText: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
