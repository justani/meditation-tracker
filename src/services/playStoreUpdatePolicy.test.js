const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const policyPath = path.join(__dirname, 'playStoreUpdatePolicy.js');
const policySource = fs.readFileSync(policyPath, 'utf8');
let policyExports;

before(async () => {
  const encodedPolicy = Buffer.from(policySource).toString('base64');
  policyExports = await import(`data:text/javascript;base64,${encodedPolicy}`);
});

const eligibleUpdate = {
  updateAvailable: true,
  flexibleAllowed: true,
  stalenessDays: 3,
};

test('offers an eligible flexible update after three days', () => {
  const { shouldOfferFlexibleUpdate } = policyExports;
  assert.equal(shouldOfferFlexibleUpdate(eligibleUpdate), true);
});

test('does not offer unavailable, disallowed, or newly published updates', () => {
  const { shouldOfferFlexibleUpdate } = policyExports;
  assert.equal(shouldOfferFlexibleUpdate({ ...eligibleUpdate, updateAvailable: false }), false);
  assert.equal(shouldOfferFlexibleUpdate({ ...eligibleUpdate, flexibleAllowed: false }), false);
  assert.equal(shouldOfferFlexibleUpdate({ ...eligibleUpdate, stalenessDays: 2 }), false);
  assert.equal(shouldOfferFlexibleUpdate({ ...eligibleUpdate, stalenessDays: null }), false);
});

test('recognizes update states that should continue without another prompt', () => {
  const { isFlexibleUpdateInProgress } = policyExports;

  assert.equal(isFlexibleUpdateInProgress({ installStatus: 'pending' }), true);
  assert.equal(isFlexibleUpdateInProgress({ installStatus: 'downloading' }), true);
  assert.equal(isFlexibleUpdateInProgress({ installStatus: 'installing' }), true);
  assert.equal(isFlexibleUpdateInProgress({ installStatus: 'failed' }), false);
  assert.equal(isFlexibleUpdateInProgress({ installStatus: 'cancelled' }), false);
});

test('keeps the prompt quiet until the three-day cooldown has elapsed', () => {
  const { isUpdatePromptCoolingDown, UPDATE_PROMPT_COOLDOWN_MS } = policyExports;
  const now = 1_000_000_000;

  assert.equal(isUpdatePromptCoolingDown({
    lastPromptAt: now - UPDATE_PROMPT_COOLDOWN_MS + 1,
    now,
  }), true);
  assert.equal(isUpdatePromptCoolingDown({
    lastPromptAt: now - UPDATE_PROMPT_COOLDOWN_MS,
    now,
  }), false);
  assert.equal(isUpdatePromptCoolingDown({ lastPromptAt: Number.NaN, now }), false);
});

test('starts a cooldown only when the user dismisses the prompt', () => {
  const { shouldStartUpdatePromptCooldown } = policyExports;
  assert.equal(shouldStartUpdatePromptCooldown({ status: 'accepted' }), false);
  assert.equal(shouldStartUpdatePromptCooldown({ status: 'cancelled' }), true);
  assert.equal(shouldStartUpdatePromptCooldown({ status: 'failed' }), false);
  assert.equal(shouldStartUpdatePromptCooldown({ status: 'unavailable' }), false);
});
