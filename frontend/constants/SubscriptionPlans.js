// constants/subscriptionPlans.js

export const PLANS = {
  basic: {
    id: 'basic',
    label: 'Basic',
    price: 'Free',
    // AideBot
    dailyChatLimit: 15,
    chatHistoryDays: 7,
    // Scans
    // dailyScanLimit: how many scans before the gate fires
    // saveGoal: complete this many scans in one day to earn bonus scans
    // bonusScans: extra scans unlocked when saveGoal is reached
    // reportHistoryDays: how far back the Reports screen loads from AsyncStorage
    dailyScanLimit: 5,
    saveGoal: 5,
    bonusScans: 2,
    reportHistoryDays: 14,
    features: [
      '5 blood smear scans / day',
      'Save 5 images in a day → 2 bonus scans unlocked',
      '15 AideBot messages / day',
      'Basic anaemia & malaria reference info',
      'Standard processing speed',
      '7-day chat history · 14-day report history',
      'Community email support',
    ],
  },
  max: {
    id: 'max',
    label: 'Max',
    price: 'Mid-tier',
    dailyChatLimit: 100,
    chatHistoryDays: 30,
    dailyScanLimit: 30,
    saveGoal: 5,
    bonusScans: 3,
    reportHistoryDays: 90,
    features: [
      '30 blood smear scans / day',
      'Save 5 images in a day → 3 bonus scans unlocked',
      '100 AideBot messages / day',
      'Scan-result-aware chat (AideBot can reference a specific scan)',
      'Priority processing queue',
      '30-day chat history · 90-day report history',
      'Priority email support (24–48h)',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price: 'Top-tier',
    dailyChatLimit: 500,
    chatHistoryDays: 365,
    dailyScanLimit: Infinity,    // no gate — unlimited
    saveGoal: 5,
    bonusScans: 0,               // no scan bonus — discount applied at renewal instead
    reportHistoryDays: 365,
    features: [
      'Unlimited blood smear scans',
      'Every 5 images saved earns a discount on your next renewal',
      '500 AideBot messages / day',
      'Full scan-result-aware chat + treatment guideline lookups',
      'Fastest processing queue',
      '1-year chat & report history',
      'Priority bug-report triage',
      'Multi-technician / lab team support',
    ],
  },
};

export const DEFAULT_PLAN = 'basic';
export const getPlan = (tierId) => PLANS[tierId] ?? PLANS[DEFAULT_PLAN];

// ── How scan limits work (plain English) ─────────────────────────────────────
//
// Basic example:
//   - Tech does scan 1 → dailyScanCount becomes 1. Remaining = 4.
//   - Tech does scan 2,3,4,5 → dailyScanCount = 5. Remaining = 0.
//   - Because savedCount (= dailyScanCount) has hit saveGoal (5),
//     bonusGranted = true, bonusScans = 2. Remaining jumps to 2.
//   - Tech does scan 6,7 → remaining hits 0 again. Gate fires.
//   - Alert: "You've used all 7 Basic scans today. Upgrade to Max for 30/day."
//   - At midnight the date-keyed AsyncStorage entry no longer matches today,
//     so all counters effectively reset to 0 — no cleanup job needed.
//
// Pro:
//   - dailyScanLimit = Infinity, so the gate never fires.
//   - Saved images accumulate in a lifetime counter (getLifetimeSavedCount).
//   - Your payment screen reads that counter and passes it to your
//     Paystack/Stripe renewal link to apply a discount server-side.
