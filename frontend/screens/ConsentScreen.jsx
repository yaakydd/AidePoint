import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch,
  StatusBar, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, scale } from '../assets/theme';
import { styles, getConsentFooterMetrics } from '../styles/ConsentStyles';

const INFO_ITEMS = [
  {
    icon: 'cloud-check-outline',
    color: COLORS.success,
    bg: COLORS.successBg,
    title: 'If you allow storage',
    body: 'Blood smear images are uploaded to secure cloud storage and used later for retraining the model to improve it.',
  },
  {
    icon: 'eye-off-outline',
    color: COLORS.info,
    bg: COLORS.infoBg,
    title: 'If you decline',
    body: 'Images are used only for AI analysis and discarded right after. Reports are still generated, only the image itself is not kept.',
  },
  {
    icon: 'pencil-outline',
    color: COLORS.warning,
    bg: COLORS.warningBg,
    title: 'You can change this later',
    body: 'Update this anytime. Go to Account then search for Data & Privacy, even while offline, it will sync once you\'re back online.',
  },
];

export default function ConsentScreen() {
  const [storeImages, setStoreImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { completeConsent } = useAuth();

  // Real device bottom inset -- this screen has no tab bar, so it can't
  // reuse getTabBarHeight(insets) like tab-bar screens do; it just needs
  // insets.bottom directly. See the comment on getConsentFooterMetrics
  // for why the previous hardcoded layout.bottomInset guess left the
  // Continue button unreachable on devices with a bigger real inset.
  const insets = useSafeAreaInsets();
  const { footerPaddingBottom, footerHeight } = getConsentFooterMetrics(insets.bottom);

  async function handleContinue() {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const result = await completeConsent(storeImages);

      if (!result.success) {
        Alert.alert(
          'Something went wrong',
          result.error || 'Could not save your preference. Please try again.',
          [{ text: 'OK' }],
        );
      }
      // On success, authState flips to 'APP' inside AuthContext and
      // App.js swaps navigators automatically — no navigate() needed.
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Consent save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: footerHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
            Before you start scanning, tell us how blood smear images should be handled.
          </Text>
        </View>

        {INFO_ITEMS.map(item => (
          <View key={item.title} style={styles.infoCard}>
            <View style={[styles.infoIconWrap, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons name={item.icon} size={scale(24)} color={item.color} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoText}>{item.body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <MaterialCommunityIcons
              name={storeImages ? 'cloud-check' : 'cloud-off-outline'}
              size={scale(24)}
              color={storeImages ? COLORS.success : COLORS.textMuted}
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
            trackColor={{ false: COLORS.border, true: COLORS.successBg === COLORS.surfaceAlt ? '#A7F3D0' : '#A7F3D0' }}
            thumbColor={storeImages ? COLORS.success : COLORS.textSecondary}
          />
        </View>

        <Text style={styles.disclaimer}>
          AidePoint stores images in a private, encrypted bucket. Images are never shared
          with third parties.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, isSaving && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.btnText}>Continue to AidePoint</Text>
              <Feather name="arrow-right" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
