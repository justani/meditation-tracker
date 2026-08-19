import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from '../hooks/useTranslation';
import { MeditationWidgetService } from '../services/meditationWidgetService';
import { shouldShowWidgetSuggestion } from '../services/widgetSuggestionPolicy';
import { COLORS } from '../theme/colors';
import {
  completeWidgetSuggestion,
  loadWidgetSuggestionState,
  recordWidgetSuggestionAction,
} from '../utils/storage';

export default function WidgetSuggestionCard({ completedSessions }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [widgetStatus, setWidgetStatus] = useState(null);

  useEffect(() => {
    let active = true;

    const checkEligibility = async () => {
      try {
        const [suggestionState, status] = await Promise.all([
          loadWidgetSuggestionState(),
          MeditationWidgetService.getStatus(),
        ]);

        if (status.added || status.everAdded) {
          await completeWidgetSuggestion();
        }

        if (active) {
          setWidgetStatus(status);
          setVisible(shouldShowWidgetSuggestion({
            hasCompletedSessions: completedSessions > 0,
            ...suggestionState,
            widgetAvailable: status.available,
            widgetAdded: status.added,
            widgetEverAdded: status.everAdded,
          }));
        }
      } catch {
        if (active) setVisible(false);
      }
    };

    checkEligibility();
    return () => {
      active = false;
    };
  }, [completedSessions]);

  const handleDismiss = async () => {
    setVisible(false);
    await recordWidgetSuggestionAction();
  };

  const handleAdd = async () => {
    if (requesting) return;

    if (!widgetStatus?.canRequestPin) {
      setVisible(false);
      await recordWidgetSuggestionAction();
      Alert.alert(
        t('Add home-screen widget'),
        t('Touch and hold an empty area on your home screen, choose Widgets, then select Meditation Tracker.')
      );
      return;
    }

    setRequesting(true);

    try {
      const opened = await MeditationWidgetService.requestPin();
      if (!opened) {
        Alert.alert(
          t('Could not add widget'),
          t('Your launcher could not open the widget picker. You can add it by touching and holding an empty area on your home screen.')
        );
        return;
      }

      setVisible(false);
      await recordWidgetSuggestionAction();
    } catch {
      Alert.alert(
        t('Could not add widget'),
        t('Your launcher could not open the widget picker. You can add it by touching and holding an empty area on your home screen.')
      );
    } finally {
      setRequesting(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="apps" size={22} color={COLORS.primaryInk} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('Keep your practice visible')}</Text>
          <Text style={styles.description}>
            {t('Add a home-screen widget for your streak, daily teaching, and morning/evening progress.')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={requesting}
          onPress={handleDismiss}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>{t('Not now')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={requesting}
          onPress={handleAdd}
          style={[styles.primaryButton, requesting && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {t(widgetStatus?.canRequestPin ? 'Add widget' : 'How to add widget')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.borderStrong,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 25,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: COLORS.primaryActive,
    borderRadius: 8,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
