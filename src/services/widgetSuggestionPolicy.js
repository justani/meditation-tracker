export const WIDGET_SUGGESTION_FOLLOW_UP_SESSIONS = 10;
export const MAX_WIDGET_SUGGESTION_ACTIONS = 2;

export const shouldShowWidgetSuggestion = ({
  hasCompletedSessions,
  completionCount,
  promptActionCount,
  lastActionCompletionCount,
  widgetAvailable,
  widgetAdded,
  widgetEverAdded,
}) => {
  if (!widgetAvailable || widgetAdded || widgetEverAdded) return false;
  if (!hasCompletedSessions) return false;
  if (promptActionCount >= MAX_WIDGET_SUGGESTION_ACTIONS) return false;
  if (promptActionCount === 0) return true;
  if (!Number.isFinite(lastActionCompletionCount)) return false;

  return completionCount >= (
    lastActionCompletionCount + WIDGET_SUGGESTION_FOLLOW_UP_SESSIONS
  );
};
