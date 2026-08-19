import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import PlayStoreUpdatesModule from '../../modules/play-store-updates/src/PlayStoreUpdatesModule';
import {
  isFlexibleUpdateInProgress,
  isUpdatePromptCoolingDown,
  shouldOfferFlexibleUpdate,
  shouldStartUpdatePromptCooldown,
  UPDATE_CHECK_INTERVAL_MS,
} from './playStoreUpdatePolicy';

const LAST_PROMPT_STORAGE_KEY = 'play_store_update_last_prompt_at';

let lastCheckAt = 0;
let updateCheckPromise = null;

const canUsePlayStoreUpdates = () => (
  Platform.OS === 'android' && PlayStoreUpdatesModule !== null
);

const isPromptCoolingDown = async (now) => {
  const storedValue = await AsyncStorage.getItem(LAST_PROMPT_STORAGE_KEY);
  const lastPromptAt = Number(storedValue);
  return isUpdatePromptCoolingDown({ lastPromptAt, now });
};

const runUpdateCheck = async ({ force, canPrompt }) => {
  if (!canUsePlayStoreUpdates()) return { status: 'unsupported' };

  const now = Date.now();
  if (!force && now - lastCheckAt < UPDATE_CHECK_INTERVAL_MS) {
    return { status: 'throttled' };
  }
  lastCheckAt = now;

  try {
    const info = await PlayStoreUpdatesModule.getUpdateInfoAsync();
    if (info.installStatus === 'downloaded') return { status: 'downloaded' };
    if (isFlexibleUpdateInProgress(info)) return { status: 'inProgress' };
    if (!shouldOfferFlexibleUpdate(info)) return { status: 'unavailable' };
    if (await isPromptCoolingDown(now)) return { status: 'cooldown' };
    if (canPrompt && !(await canPrompt())) return { status: 'deferred' };

    const result = await PlayStoreUpdatesModule.startFlexibleUpdateAsync();
    if (shouldStartUpdatePromptCooldown(result)) {
      await AsyncStorage.setItem(LAST_PROMPT_STORAGE_KEY, String(now));
    }
    return result;
  } catch (error) {
    if (__DEV__) {
      console.warn('Unable to check for a Google Play update:', error);
    }
    return { status: 'error' };
  }
};

export const checkForFlexiblePlayStoreUpdate = ({ force = false, canPrompt = null } = {}) => {
  if (updateCheckPromise) return updateCheckPromise;

  updateCheckPromise = runUpdateCheck({ force, canPrompt })
    .finally(() => {
      updateCheckPromise = null;
    });
  return updateCheckPromise;
};

export const completePlayStoreUpdate = async () => {
  if (!canUsePlayStoreUpdates()) return false;

  try {
    return await PlayStoreUpdatesModule.completeUpdateAsync();
  } catch (error) {
    if (__DEV__) {
      console.warn('Unable to complete the Google Play update:', error);
    }
    return false;
  }
};

export const addPlayStoreUpdateStatusListener = (listener) => {
  if (!canUsePlayStoreUpdates()) return { remove: () => {} };
  return PlayStoreUpdatesModule.addListener('onUpdateStatusChanged', listener);
};
