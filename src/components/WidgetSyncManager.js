import { useEffect, useMemo } from 'react';

import MeditationWidgetModule from '../../modules/meditation-widget/src/MeditationWidgetModule';
import { useMeditation } from '../context/MeditationContext';
import { SESSION_TYPES } from '../types';
import { getTodayDate } from '../utils/dateHelpers';
import { getAllQuotes } from '../utils/notificationMessages';
import { getSessionPeriod } from '../utils/sessionHelpers';

const getFollowingDate = (dateString) => {
  const [year, month, day] = String(dateString || '').split('-').map(Number);
  if (!year || !month || !day) return '';

  const followingDate = new Date(Date.UTC(year, month - 1, day + 1));
  return followingDate.toISOString().slice(0, 10);
};

export default function WidgetSyncManager() {
  const { loading, sessions, settings, userProgress } = useMeditation();
  const snapshot = useMemo(() => {
    const today = getTodayDate();
    const completedPeriods = new Set(
      sessions
        .filter(session => session.completed && session.date === today)
        .map(getSessionPeriod)
    );
    const language = settings.language === 'hindi' ? 'hindi' : 'english';
    const theme = ['light', 'dark', 'auto'].includes(settings.theme)
      ? settings.theme
      : 'auto';

    return {
      currentStreak: userProgress.currentStreak || 0,
      quotes: getAllQuotes(language),
      morningCompleted: completedPeriods.has(SESSION_TYPES.MORNING),
      eveningCompleted: completedPeriods.has(SESSION_TYPES.EVENING),
      theme,
      snapshotDate: today,
      streakValidThrough: getFollowingDate(userProgress.lastSessionDate),
      language,
    };
  }, [
    sessions,
    settings.language,
    settings.theme,
    userProgress.currentStreak,
    userProgress.lastSessionDate,
  ]);

  useEffect(() => {
    if (loading || !MeditationWidgetModule) return;

    MeditationWidgetModule.updateAsync(
      snapshot.currentStreak,
      snapshot.quotes,
      snapshot.morningCompleted,
      snapshot.eveningCompleted,
      snapshot.theme,
      snapshot.snapshotDate,
      snapshot.streakValidThrough,
      snapshot.language
    ).catch(error => {
      console.warn('Unable to update the meditation home-screen widget:', error);
    });
  }, [loading, snapshot]);

  return null;
}
