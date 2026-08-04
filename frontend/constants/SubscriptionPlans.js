// constants/SubscriptionPlans.js
//
// AidePoint subscription tiers — controls both AideBot daily chat allowance
// and blood-smear scan allowance/rewards. `user.subscriptionTier` (from
// AuthContext / Supabase profile) should be one of these keys.
//
// Scan reward logic:
//  - basic / max: every completed scan counts toward both the daily scan
//    count AND the "saved images" counter (the smear image is always
//    uploaded to Supabase Storage as part of analysis, so a completed scan
//    *is* a saved image). Reaching `saveGoal` saved images in a day grants
//    `bonusScans` extra scans for that same day.
//  - pro: scans are effectively unlimited, but saved images accumulate
//    over time (not reset daily) toward a discount applied at their next
//    subscription renewal — handled by your billing logic server-side;
//    the app just tracks and displays progress toward it.
//
// FIXED: filename renamed from subscriptionPlans.js (lowercase s) to
// SubscriptionPlans.js (capital S) -- SubscriptionScreen.js and
// Chatbot.js both import from '../constants/SubscriptionPlans' with a
// capital S. The mismatch was silently working on case-insensitive
// filesystems (macOS/Windows) but would throw "module not found" on
// Linux or most production Metro bundler configs.
export const PLANS = {
  basic: {
    id: 'basic',
    label: 'Basic',
    price: 'Free',
    // AideBot
    dailyChatLimit: 15,
    chatHistoryDays: 7,
    reportHistoryDays: 14,
    scans: {
      dailyLimit: 5,
      saveGoal: 5,
      bonusScans: 1,
      rewardType: 'bonus_scans',
    },
    // FIXED: removed 2 lines that duplicated info already shown by
    // planScanLine()/planAideBotLine() in SubscriptionScreen.js (the
    // scan-count and bonus-scan lines were listed here a second time,
    // more verbosely, causing "5 blood smear scans/day" to render twice
    // in a row on the card). `features` should only hold bullets that
    // aren't already covered by those two dedicated lines.
    features: [
      'Basic anaemia & malaria reference info',
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
    reportHistoryDays: 90,
    scans: {
      dailyLimit: 30,
      saveGoal: 5,
      bonusScans: 3,
      rewardType: 'bonus_scans',
    },
    // FIXED: same dedupe as basic.features above.
    features: [
      'Scan-result-aware chat (AideBot can reference a specific scan)',
      'Priority scan processing queue',
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
    reportHistoryDays: 365,
    scans: {
      dailyLimit: Infinity,
      saveGoal: 5,
      rewardType: 'renewal_discount',
      discountLabel: '15% off your next renewal for every 5 images saved',
    },
    features: [
      'Unlimited blood smear scans — every 5 images saved earns a discount on your next renewal',
      'Full scan-result-aware chat + treatment guideline lookups',
      'Fastest scan processing queue',
      '1-year chat & report history',
      'Priority bug-report triage',
      'Multi-technician / lab team support',
    ],
  },
};

export const DEFAULT_PLAN = 'basic';

export function getPlan(tierId) {
  return PLANS[tierId] ?? PLANS[DEFAULT_PLAN];
}

// FIXED: SubscriptionScreen.js renders plans as an ordered list via
// SUBSCRIPTION_PLANS.map(...), but PLANS is an object (keyed by tier id),
// not an array -- there was no SUBSCRIPTION_PLANS export at all, so the
// import silently resolved to undefined and .map() crashed with
// "Cannot read property 'map' of undefined". Deriving the array here
// (rather than changing the screen to Object.values(PLANS)) keeps PLANS
// as the single source of truth and lets us control display order
// explicitly instead of relying on object key insertion order.
export const SUBSCRIPTION_PLANS = [PLANS.basic, PLANS.max, PLANS.pro];