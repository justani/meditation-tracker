export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
export const UPDATE_PROMPT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
export const MIN_UPDATE_STALENESS_DAYS = 3;

export const shouldOfferFlexibleUpdate = (info) => Boolean(
  info.updateAvailable
  && info.flexibleAllowed
  && Number.isFinite(info.stalenessDays)
  && info.stalenessDays >= MIN_UPDATE_STALENESS_DAYS
);

export const isFlexibleUpdateInProgress = (info) => (
  info.installStatus === 'pending'
  || info.installStatus === 'downloading'
  || info.installStatus === 'installing'
);

export const isUpdatePromptCoolingDown = ({ lastPromptAt, now }) => (
  Number.isFinite(lastPromptAt)
  && now - lastPromptAt < UPDATE_PROMPT_COOLDOWN_MS
);

export const shouldStartUpdatePromptCooldown = (result) => (
  result.status === 'cancelled'
);
