// screens/auth/ConsentScreen.js
//
// Shown ONCE after a new user registers — before the main app.
// Asks whether the user wants blood smear images saved to cloud storage.
//
// This preference is stored on the user's profile (store_images column).
// It can be changed later at any time from the Profile screen.
//
// When completeOnboarding() is called:
//   → saves to Supabase profiles table
//   → sets needsConsent = false in AuthContext
//   → AppNavigator automatically switches to MainAppNavigator

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch,
  StyleSheet, StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, layout, scale, mScale } from '../../assets/theme';

// What each choice means — shown as info cards on the screen
const INFO_ITEMS = [
  {
    icon: 'cloud-check-outline',
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'If you allow storage',
    body: 'Blood smear images are uploaded to secure cloud storage and linked to the scan report. Doctors can view them alongside the clinical results.',
  },
  {
    icon: 'eye-off-outline',
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'If you decline',
    body: 'Images are used only for AI analysis and immediately discarded. Nothing is stored. Reports are still generated — only the image itself is not kept.',
  },
  {
    icon: 'pencil-outline',
    color: '#F59E0B',
    bg: '#FFFBEB',
    title: 'You can change this later',
    body: 'This preference can be updated at any time from your Profile screen. Your choice here is just the default.',
  },
];

export default function ConsentScreen() {
  const [storeImages, setStoreImages] = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);

  const { completeOnboarding, user } = useAuth();

  async function handleContinue() {
    setIsSaving(true);
    await completeOnboarding(storeImages);
    // completeOnboarding() sets needsConsent = false in AuthContext.
    // AppNavigator reacts to this and switches to MainAppNavigator.
    // No navigation.navigate() needed here.
    setIsSaving(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={scale(48)}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.title}>Image Storage</Text>
          <Text style={styles.subtitle}>
            Before you start, tell us how you'd like blood smear images handled.
          </Text>
        </View>

        {/* Info cards */}
        {INFO_ITEMS.map(item => (
          <View key={item.title} style={styles.infoCard}>
            <View style={[styles.infoIconWrap, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoText}>{item.body}</Text>
            </View>
          </View>
        ))}

        {/* Toggle row */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <MaterialCommunityIcons
              name={storeImages ? 'cloud-check' : 'cloud-off-outline'}
              size={24}
              color={storeImages ? '#10B981' : COLORS.textMuted}
            />
            <View>
              <Text style={styles.toggleLabel}>
                {storeImages ? 'Storage allowed' : 'Do not store images'}
              </Text>
              <Text style={styles.toggleSub}>
                {storeImages
                  ? 'Images will be uploaded securely'
                  : 'Images are used for analysis only'}
              </Text>
            </View>
          </View>
          <Switch
            value={storeImages}
            onValueChange={setStoreImages}
            trackColor={{ false: COLORS.border, true: '#A7F3D0' }}
            thumbColor={storeImages ? '#10B981' : COLORS.textSecondary}
          />
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          AidePoint stores images in a private, encrypted bucket. Images are never shared
          with third parties. This setting applies to all future scans until you change it.
        </Text>
      </ScrollView>

      {/* Sticky footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, isSaving && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color={COLORS.white} />
            : <>
                <Text style={styles.btnText}>Continue to AidePoint</Text>
                <Feather name="arrow-right" size={20} color={COLORS.white} />
              </>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.white },
  container:  { paddingHorizontal: SPACING.pagePad, paddingBottom: 120 },

  header: {
    alignItems: 'center',
    paddingTop: scale(40),
    paddingBottom: SPACING['2xl'],
  },
  iconWrap: {
    width: scale(88),
    height: scale(88),
    borderRadius: RADIUS.full,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS['2xl'],
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: mScale(22),
  },

  infoCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  infoIconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoBody:  { flex: 1 },
  infoTitle: { fontSize: FONTS.sm, fontWeight: FONTS.semibold, color: COLORS.textPrimary, marginBottom: 4 },
  infoText:  { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: mScale(19) },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  toggleLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  toggleLabel: { fontSize: FONTS.md, fontWeight: FONTS.semibold, color: COLORS.textPrimary },
  toggleSub:   { fontSize: FONTS.xs, color: COLORS.textSecondary, marginTop: 2 },

  disclaimer: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    lineHeight: mScale(18),
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.pagePad,
    paddingTop: SPACING.md,
    paddingBottom: layout.bottomInset + SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  btnDisabled: { opacity: 0.65 },
  btnText:     { color: COLORS.white, fontSize: FONTS.lg, fontWeight: FONTS.semibold },
});
