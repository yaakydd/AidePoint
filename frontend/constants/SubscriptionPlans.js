export const PLANS = {
  basic: {
    id: 'basic',
    label: 'Basic',
    price: 'Free',
    comingSoon: false,
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
      'Basic anaemia & malaria reference info',
      '7-day chat history · 14-day report history',
      'Community email support',
    ],
  },
  max: {
    id: 'max',
    label: 'Max',
    price: 'Mid-tier',
    comingSoon: true,
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
    comingSoon: true,
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

export const SUBSCRIPTION_PLANS = [PLANS.basic, PLANS.max, PLANS.pro];