// Plan comparison + upgrade screen. Note: there's no payment provider wired
// up yet (mobile money is the obvious choice for Ghana but that's its own
// project) — tapping "Upgrade" for now just shows a placeholder alert
// instead of pretending to process a payment. Swap handleUpgrade() out
// once that's actually built.
//
// Assumes constants/subscriptionPlans.js exports something shaped like:
//   export const SUBSCRIPTION_PLANS = [
//     { id: 'basic', name: 'Basic', price: 0, priceLabel: 'Free',
//       scans: { dailyLimit: 5, bonusPerFive: 2 },
//       aideBot: { dailyLimit: 15 }, features: [...] },
//     { id: 'max', ... },
//     { id: 'pro', ... },
//   ];
//   export function getPlan(tierId) { ... }
// If your actual file uses different field names, adjust the plan.* reads
// below rather than the whole layout — everything else should still work.

import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { SUBSCRIPTION_PLANS, getPlan } from '../constants/SubscriptionPlans';
import { styles } from '../styles/SubscriptionStyles';

const PLAN_COLORS = {
  basic: '#64748B',
  max:   '#0EA5E9',
  pro:   '#7C3AED',
};

function planScanLine(plan) {
  const limit = plan.scans?.dailyLimit;
  if (limit === Infinity || limit == null) return 'Unlimited scans/day';
  const bonus = plan.scans?.bonusPerFive;
  return bonus
    ? `${limit} scans/day (+${bonus} bonus after 5 saved images)`
    : `${limit} scans/day`;
}

function planAideBotLine(plan) {
  const limit = plan.aideBot?.dailyLimit;
  return limit ? `${limit} AideBot messages/day` : 'AideBot access';
}

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const currentPlan = getPlan(user?.subscriptionTier);

  function handleUpgrade(plan) {
    if (plan.id === currentPlan?.id) return;

    // TODO: hook this up to a real payment flow (mobile money most likely)
    // once that's built. For now this is just a placeholder so the button
    // isn't dead — don't ship this Alert to real users.
    Alert.alert(
      `Switch to ${plan.name}`,
      `Payments aren't set up yet — for now, reach out to support to change your plan to ${plan.name}.`,
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Pick the plan that matches how many scans you're running each day.
        </Text>

        {SUBSCRIPTION_PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan?.id;
          const color = PLAN_COLORS[plan.id] || PLAN_COLORS.basic;

          return (
            <View
              key={plan.id}
              style={[styles.card, isCurrent && { borderColor: color, borderWidth: 1.5 }]}
            >
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: color }]}>
                  <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={[styles.planIcon, { backgroundColor: `${color}18` }]}>
                  <MaterialCommunityIcons
                    name={plan.id === 'pro' ? 'crown' : plan.id === 'max' ? 'lightning-bolt' : 'leaf'}
                    size={20}
                    color={color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color }]}>{plan.priceLabel}</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <Feather name="check" size={15} color={color} />
                <Text style={styles.featureText}>{planScanLine(plan)}</Text>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={15} color={color} />
                <Text style={styles.featureText}>{planAideBotLine(plan)}</Text>
              </View>
              {(plan.features || []).map(f => (
                <View style={styles.featureRow} key={f}>
                  <Feather name="check" size={15} color={color} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  isCurrent ? styles.actionBtnDisabled : { backgroundColor: color },
                ]}
                disabled={isCurrent}
                onPress={() => handleUpgrade(plan)}
              >
                <Text style={[styles.actionBtnText, isCurrent && styles.actionBtnTextDisabled]}>
                  {isCurrent ? "You're on this plan" : `Switch to ${plan.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.footnote}>
          Bonus scans are credited automatically once you've saved 5 images in a day —
          they don't require switching plans.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
