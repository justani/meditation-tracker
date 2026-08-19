const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const policyPath = path.join(__dirname, 'widgetSuggestionPolicy.js');
const policySource = fs.readFileSync(policyPath, 'utf8');
let policyExports;

before(async () => {
  const encodedPolicy = Buffer.from(policySource).toString('base64');
  policyExports = await import(`data:text/javascript;base64,${encodedPolicy}`);
});

const eligibleState = {
  hasCompletedSessions: true,
  completionCount: 1,
  promptActionCount: 0,
  lastActionCompletionCount: null,
  widgetAvailable: true,
  widgetAdded: false,
  widgetEverAdded: false,
};

test('offers the first widget suggestion after the first completed session', () => {
  const { shouldShowWidgetSuggestion } = policyExports;
  assert.equal(shouldShowWidgetSuggestion({
    ...eligibleState,
    hasCompletedSessions: false,
  }), false);
  assert.equal(shouldShowWidgetSuggestion(eligibleState), true);
});

test('offers one follow-up ten sessions after the first prompt action', () => {
  const { shouldShowWidgetSuggestion } = policyExports;
  const dismissedAtFiveSessions = {
    ...eligibleState,
    promptActionCount: 1,
    completionCount: 5,
    lastActionCompletionCount: 5,
  };

  assert.equal(shouldShowWidgetSuggestion({
    ...dismissedAtFiveSessions,
    completionCount: 14,
  }), false);
  assert.equal(shouldShowWidgetSuggestion({
    ...dismissedAtFiveSessions,
    completionCount: 15,
  }), true);
});

test('never offers more than two widget suggestions', () => {
  const { shouldShowWidgetSuggestion } = policyExports;
  assert.equal(shouldShowWidgetSuggestion({
    ...eligibleState,
    completionCount: 100,
    promptActionCount: 2,
    lastActionCompletionCount: 15,
  }), false);
});

test('suppresses suggestions when the widget is installed or was previously added', () => {
  const { shouldShowWidgetSuggestion } = policyExports;
  assert.equal(shouldShowWidgetSuggestion({
    ...eligibleState,
    widgetAdded: true,
  }), false);
  assert.equal(shouldShowWidgetSuggestion({
    ...eligibleState,
    widgetEverAdded: true,
  }), false);
  assert.equal(shouldShowWidgetSuggestion({
    ...eligibleState,
    widgetAvailable: false,
  }), false);
});

test('does not require automated pinning support for a manual-add suggestion', () => {
  const { shouldShowWidgetSuggestion } = policyExports;
  assert.equal(shouldShowWidgetSuggestion({
    ...eligibleState,
    canRequestPin: false,
  }), true);
});
