// constants/subscriptionPlans.js

/**
 * AidePoint subscription tiers — controls both AideBot daily chat allowance
 * and blood-smear scan allowance/rewards. `user.subscriptionTier` (from
 * AuthContext / Supabase profile) should be one of these keys.
 *
 * Scan reward logic:
 *  - basic / max: every completed scan counts toward both the daily scan
 *    count AND the "saved images" counter (the smear image is always
 *    uploaded to Supabase Storage as part of analysis, so a completed scan
 *    *is* a saved image). Reaching `saveGoal` saved images in a day grants
 *    `bonusScans` extra scans for that same day.
 *  - pro: scans are effectively unlimited, but saved images accumulate
 *    over time (not reset daily) toward a discount applied at their next
 *    subscription renewal — handled by your billing logic server-side;
 *    the app just tracks and displays progress toward it.
 */
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
    features: [
      '5 blood smear scans / day',
      'Save 5 images in a day → 2 bonus scans unlocked',
      '15 AideBot messages / day',
      '5 blood smear scans / day (+2 bonus when you save 5 images in a day)',
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
    features: [
      '30 blood smear scans / day',
      'Save 5 images in a day → 3 bonus scans unlocked',
      '100 AideBot messages / day',
      '30 blood smear scans / day (+3 bonus when you save 5 images in a day)',
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
      '500 AideBot messages / day (effectively unlimited for daily lab use)',
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
