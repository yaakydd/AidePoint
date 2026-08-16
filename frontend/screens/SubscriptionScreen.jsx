import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { COLORS, HEADER } from '../assets/theme';
import { SUBSCRIPTION_PLANS, getPlan } from '../constants/SubscriptionPlans';
import { styles } from '../styles/SubscriptionStyles';
import Header from '../components/Header';

function planScanLine(plan) {
  const limit = plan.scans?.dailyLimit;
  if (limit === Infinity || limit == null) return 'Unlimited scans/day';
  const bonus = plan.scans?.bonusScans;
  return bonus
    ? `${limit} scans/day (+${bonus} bonus after ${plan.scans.saveGoal} saved images)`
    : `${limit} scans/day`;
}

function planAideBotLine(plan) {
  const limit = plan.dailyChatLimit;
  return limit ? `${limit} AideBot messages/day` : 'AideBot access';
}

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const currentPlan = getPlan(user?.subscriptionTier);

  function handleUpgrade(plan) {
    if (plan.id === currentPlan?.id || plan.comingSoon) return;

    // TODO: hook this up to a real payment flow (mobile money most likely)
    // once that's built. For now this is just a placeholder so the button
    // isn't dead — don't ship this Alert to real users.
    Alert.alert(
      `Switch to ${plan.label}`,
      `Payments aren't set up yet — for now, reach out to support to change your plan to ${plan.label}.`,
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        left={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={HEADER.iconSize} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
        center={<Text style={styles.headerTitle}>Subscription</Text>}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          Pick the plan that matches how many scans you're running each day.
        </Text>

        {SUBSCRIPTION_PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan?.id;
          const locked = plan.comingSoon;

          return (
            <View
              key={plan.id}
              style={[
                styles.card,
                isCurrent && styles.cardCurrent,
                locked && styles.cardLocked,
              ]}
            >
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
                </View>
              )}
              {locked && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={[styles.planIcon, locked && styles.planIconLocked]}>
                  <MaterialCommunityIcons
                    name={plan.id === 'pro' ? 'crown-outline' : plan.id === 'max' ? 'lightning-bolt-outline' : 'leaf'}
                    size={20}
                    color={locked ? COLORS.textMuted : COLORS.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planName, locked && styles.planNameLocked]}>{plan.label}</Text>
                  <Text style={[styles.planPrice, locked && styles.planPriceLocked]}>{plan.price}</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <Feather name="check" size={15} color={locked ? COLORS.textMuted : COLORS.primary} />
                <Text style={[styles.featureText, locked && styles.featureTextLocked]}>{planScanLine(plan)}</Text>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check" size={15} color={locked ? COLORS.textMuted : COLORS.primary} />
                <Text style={[styles.featureText, locked && styles.featureTextLocked]}>{planAideBotLine(plan)}</Text>
              </View>
              {(plan.features || []).map(f => (
                <View style={styles.featureRow} key={f}>
                  <Feather name="check" size={15} color={locked ? COLORS.textMuted : COLORS.primary} />
                  <Text style={[styles.featureText, locked && styles.featureTextLocked]}>{f}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  isCurrent || locked ? styles.actionBtnDisabled : styles.actionBtnActive,
                ]}
                disabled={isCurrent || locked}
                onPress={() => handleUpgrade(plan)}
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    (isCurrent || locked) && styles.actionBtnTextDisabled,
                  ]}
                >
                  {isCurrent ? "You're on this plan" : locked ? 'Coming Soon' : `Switch to ${plan.label}`}
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