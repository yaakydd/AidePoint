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
    features: [
      '15 AideBot messages / day',
      'Basic anaemia & malaria reference info',
      'Blood smear scanning (standard processing speed)',
      '7-day chat history',
      'Community email support',
    ],
  },
  max: {
    id: 'max',
    label: 'Max',
    price: 'Mid-tier',
    dailyChatLimit: 100,
    chatHistoryDays: 30,
    features: [
      '100 AideBot messages / day',
      'Scan-result-aware chat (AideBot can reference a specific scan)',
      'Priority scan processing queue',
      '30-day chat history',
      'Priority email support (24–48h)',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price: 'Top-tier',
    dailyChatLimit: 500,
    chatHistoryDays: 365,
    features: [
      '500 AideBot messages / day (effectively unlimited for daily lab use)',
      'Full scan-result-aware chat + treatment guideline lookups',
      'Fastest scan processing queue',
      '1-year chat history',
      'Priority bug-report triage',
      'Multi-technician / lab team account support',
    ],
  },
};

export const DEFAULT_PLAN = 'basic';

export function getPlan(tierId) {
  return PLANS[tierId] ?? PLANS[DEFAULT_PLAN];
}