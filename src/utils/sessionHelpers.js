import { SESSION_TYPES } from '../types';

export const getSessionPeriod = (session) => {
  if (session.type !== SESSION_TYPES.TIMER) return session.type;
  if (
    session.period === SESSION_TYPES.MORNING
    || session.period === SESSION_TYPES.EVENING
  ) {
    return session.period;
  }

  const timerId = String(session.id || '');
  const timerIdTimestamp = timerId.startsWith('timer_')
    ? Number(timerId.slice('timer_'.length))
    : Number.NaN;
  const timestamp = [session.startedAt, session.completedAt, timerIdTimestamp]
    .find(value => Number.isFinite(value));
  const sessionTime = new Date(timestamp);

  if (!Number.isFinite(sessionTime.getTime())) return SESSION_TYPES.MORNING;
  return sessionTime.getHours() < 12
    ? SESSION_TYPES.MORNING
    : SESSION_TYPES.EVENING;
};

export const formatMeditationTime = (totalMinutes) => {
  const roundedMinutes = Math.round(totalMinutes);
  if (roundedMinutes < 60) return `${roundedMinutes} min`;

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};
