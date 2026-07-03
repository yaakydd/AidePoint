// screens/ProfileScreen.js
//
// Redesigned in the "Gmail account page" style:
//   — centered identity block (avatar, name, email, role, plan pill,
//     "Manage Subscription" pill button) instead of a left-aligned card
//   — grouped settings sections below (Account / Data & Privacy /
//     Security / Preferences / Support)
//   — plain text "Sign out" link at the very bottom instead of a red row
//     inside a card, matching Gmail's "Sign out of all accounts" pattern
//
// All styling lives in styles/ProfileStyles.js — see note at the bottom
// of this file about the one field (`user.subscriptionTier`) that still
// needs to be wired up in AuthContext.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Switch, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { styles } from '../styles/ProfileStyles';

// Must match whatever key reportPin.js uses to store the PIN.
// If your reportPin.js already exports a constant for this, import
// that instead of redefining it here so the two never drift apart.
const PIN_KEY = 'aidepoint_report_pin';

const ROLE_DISPLAY = {
  lab_technician:        'Lab Technician',
  senior_lab_technician: 'Senior Lab Technician',
};

const TIER_LABELS = { basic: 'Basic Plan', max: 'Max Plan', pro: 'Pro Plan' };
const TIER_COLORS = { basic: '#64748B', max: '#0EA5E9', pro: '#7C3AED' };

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateProfile, isOnline } = useAuth();

  const [storeImages, setStoreImages] = useState(user?.storeImages ?? false);
  const [saving, setSaving] = useState(false);

  const initials  = getInitials(user?.name);
  const roleLabel = ROLE_DISPLAY[user?.role] || 'Lab Technician';

  // Falls back to 'basic' until subscriptionTier is added to AuthContext
  // (see note at the bottom of this file).
  const tier      = user?.subscriptionTier || 'basic';
  const tierLabel = TIER_LABELS[tier] || 'Basic Plan';
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.basic;

  async function handleToggle(newValue) {
    const prev = storeImages;
    setStoreImages(newValue);

    setSaving(true);
    const result = await updateProfile({ storeImages: newValue });
    setSaving(false);

    if (!result.success) {
      setStoreImages(prev);
      Alert.alert('Error', result.error || 'Could not save preference.');
    }
  }

  function handleResetPin() {
    Alert.alert(
      'Reset Report PIN',
      "You'll be asked to set a new 4-digit PIN the next time you open Reports.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(PIN_KEY);
              Alert.alert('PIN Reset', 'Your report PIN has been cleared.');
            } catch {
              Alert.alert('Error', 'Could not reset PIN. Please try again.');
            }
          },
        },
      ],
    );
  }

  function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of AidePoint?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
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
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── Centered identity block, Gmail-style ── */}
        <View style={styles.identityBlock}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name || 'Unknown'}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>
          <Text style={styles.userRole}>
            {roleLabel}{user?.hospitalLab ? ` · ${user.hospitalLab}` : ''}
          </Text>

          <View style={[styles.tierPill, { backgroundColor: `${tierColor}18`, borderColor: tierColor }]}>
            <MaterialCommunityIcons name="crown-outline" size={13} color={tierColor} />
            <Text style={[styles.tierPillText, { color: tierColor }]}>{tierLabel}</Text>
          </View>

          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="cloud-off-outline" size={14} color="#B45309" />
            <Text style={styles.offlineBannerText}>
              Offline — changes save locally and sync when connected
            </Text>
          </View>
        )}

        <Section title="ACCOUNT">
          <Row
            icon="email-outline" iconColor="#3B82F6" iconBg="#EFF6FF"
            label="Email" value={user?.email || '—'}
          />
          <Divider />
          <Row
            icon="office-building-outline" iconColor="#22C55E" iconBg="#F0FDF4"
            label="Hospital / Lab" value={user?.hospitalLab || 'Not set'}
          />
        </Section>

        <Section title="DATA & PRIVACY">
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#FDF4FF' }]}>
              <MaterialCommunityIcons name="image-outline" size={19} color="#A855F7" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.rowLabel}>Save Scan Images</Text>
              <Text style={styles.rowSub}>
                {storeImages
                  ? 'Images are stored securely for review'
                  : 'Images are analyzed then discarded'}
              </Text>
            </View>
            <Switch
              value={storeImages}
              onValueChange={handleToggle}
              disabled={saving}
              trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
              thumbColor={storeImages ? '#0EA5E9' : '#94A3B8'}
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </Section>

        <Section title="SECURITY">
          <Row
            icon="shield-lock-outline" iconColor="#0EA5E9" iconBg="#F0F9FF"
            label="Change Password"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
          <Divider />
          <Row
            icon="lock-reset" iconColor="#F59E0B" iconBg="#FFFBEB"
            label="Reset Report PIN"
            onPress={handleResetPin}
          />
        </Section>

        <Section title="PREFERENCES">
          <Row
            icon="bell-outline" iconColor="#F97316" iconBg="#FFF7ED"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
          <Divider />
          <Row
            icon="translate" iconColor="#8B5CF6" iconBg="#F5F3FF"
            label="Language" value="English (US)"
            onPress={() => {}}
          />
        </Section>

        <Section title="SUPPORT">
          <Row
            icon="help-circle-outline" iconColor="#22C55E" iconBg="#F0FDF4"
            label="Help Center" onPress={() => {}}
          />
          <Divider />
          <Row
            icon="file-document-outline" iconColor="#F43F5E" iconBg="#FFF1F2"
            label="Privacy Policy" onPress={() => {}}
          />
        </Section>

        <TouchableOpacity style={styles.signOutRow} onPress={handleLogout} activeOpacity={0.6}>
          <Text style={styles.signOutText}>Sign out of AidePoint</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AIDEPOINT V2.4.1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ icon, iconColor, iconBg, label, value, onPress }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={19} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      ) : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={17} color="#CBD5E1" />
      ) : null}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── NOTE ───────────────────────────────────────────────────
// `user.subscriptionTier` is not yet populated by AuthContext.
// In context/AuthContext.js → hydrateUser(), add one line to the
// userData object built from the `profiles` row:
//
//   subscriptionTier: profile?.subscription_tier || 'basic',
//
// (the `subscription_tier` column already exists per your Supabase
// schema notes). Once that's added, the plan pill and "Manage
// Subscription" button here will reflect the real tier automatically.
