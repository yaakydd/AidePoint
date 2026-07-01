// constants/subscriptionPlans.js

/**
 * AidePoint subscription tiers — controls AideBot daily chat allowance
 * and a few other gated features. `user.subscriptionTier` (from
 * AuthContext / Supabase profile) should be one of these keys.
 */
export const PLANS = {
  basic: {
    id: 'basic',
    label: 'Basic',
    price: 'Free',
    dailyChatLimit: 15,
    chatHistoryDays: 7,
    // Scans
    dailyScanLimit: 5,
    imagesToSaveForBonus: 5,   // save (store) this many scan images in a day…
    bonusScans: 2,             // …to unlock 2 extra scans that same day
    reportRetentionDays: 7,
    features: [
      '15 AideBot messages / day',
      '5 blood smear scans / day (+2 bonus for saving 5 scan images in a day)',
      'Basic anaemia & malaria reference info',
      'Blood smear scanning (standard processing speed)',
      '7-day chat & report history',
      'Community email support',
    ],
  },
  max: {
    id: 'max',
    label: 'Max',
    price: 'Mid-tier',
    dailyChatLimit: 100,
    chatHistoryDays: 30,
    // Scans
    dailyScanLimit: 30,
    imagesToSaveForBonus: 5,
    bonusScans: 3,
    reportRetentionDays: 30,
    features: [
      '100 AideBot messages / day',
      '30 blood smear scans / day (+3 bonus for saving 5 scan images in a day)',
      'Scan-result-aware chat (AideBot can reference a specific scan)',
      'Priority scan processing queue',
      '30-day chat & report history',
      'Priority email support (24–48h)',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price: 'Top-tier',
    dailyChatLimit: 500,
    chatHistoryDays: 365,
    // Scans
    dailyScanLimit: Infinity,
    imagesToSaveForBonus: 5,
    bonusScans: 0,              // no daily cap to bonus against
    rewardsRenewalDiscount: true, // every 5 saved images earns a renewal-price credit instead
    reportRetentionDays: 365,
    features: [
      '500 AideBot messages / day (effectively unlimited for daily lab use)',
      'Unlimited blood smear scans — every 5 saved scan images earns a discount on your next renewal',
      'Full scan-result-aware chat + treatment guideline lookups',
      'Fastest scan processing queue',
      '1-year chat & report history',
      'Priority bug-report triage',
      'Multi-technician / lab team account support',
    ],
  },
};

export const DEFAULT_PLAN = 'basic';

export function getPlan(tierId) {
  return PLANS[tierId] ?? PLANS[DEFAULT_PLAN];
}
