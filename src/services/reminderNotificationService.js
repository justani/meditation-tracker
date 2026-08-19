import * as Notifications from 'expo-notifications';
import { translate } from '../i18n';

export const REMINDER_CATEGORY_ID = 'meditationReminderActions';
export const REMINDER_START_ACTION_ID = 'startNow';
export const REMINDER_NOTIFICATION_KIND = 'meditation-reminder';
export const REMINDER_START_DURATION_MINUTES = 10;

export const configureReminderNotificationActions = async (language = 'english') => {
  await Notifications.setNotificationCategoryAsync(
    REMINDER_CATEGORY_ID,
    [
      {
        identifier: REMINDER_START_ACTION_ID,
        buttonTitle: translate(language, 'Start now'),
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'later',
        buttonTitle: translate(language, 'Later'),
        options: {
          opensAppToForeground: false,
        },
      },
    ]
  );
};
