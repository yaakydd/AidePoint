// screens/ProfileScreen.js
//
// Gmail-style layout (centered identity block, grouped settings sections,
// plain-text sign-out link). Two things added this round: real avatar
// upload (tap the camera badge on the avatar), and stripped the isOnline/
// offline-banner bits since the app's online-only now — matches the same
// cleanup already done on api.js and Scan.js.

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Switch, StatusBar, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { styles } from '../styles/ProfileStyles';
import { clearPin, endSession } from '../utils/reportPin';
import { clearReports } from '../utils/ReportUtils';
import { MaterialIcons } from '@expo/vector-icons';

const AVATAR_BUCKET = 'avatars';

const ROLE_DISPLAY = {
  lab_technician:        'Lab Technician',
  senior_lab_technician: 'Senior Lab Technician',
};

const TIER_LABELS = { basic: 'Basic Plan', max: 'Max Plan', pro: 'Pro Plan' };
const TIER_COLORS = { basic: '#64748B', max: '#0EA5E9', pro: '#7C3AED' };

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateProfile } = useAuth();

  const [storeImages, setStoreImages] = useState(user?.storeImages ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const initials  = getInitials(user?.name);
  const roleLabel = ROLE_DISPLAY[user?.role] || 'Lab Technician';

  // falls back to 'basic' until subscriptionTier is actually populated in
  // AuthContext's hydrateUser() — see the note at the bottom of this file
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

  async function handleChangeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);

    try {
      // grab the picked file as a blob so we can hand it to Supabase storage
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      // cache-bust — same path every time means the old image would
      // otherwise stick around in the RN Image cache after an update
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const saveResult = await updateProfile({ avatarUrl: publicUrl });
      if (!saveResult.success) throw new Error(saveResult.error);

    } catch (err) {
      Alert.alert('Upload Failed', err.message ?? 'Could not update your profile picture.');
    } finally {
      setUploadingAvatar(false);
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
    await clearPin(user.id);
    endSession();
    Alert.alert('PIN Reset', 'Your report PIN has been reset. You\'ll be asked to create a new one next time you open Reports.');
  } catch (err) {
    Alert.alert('Error', err.message ?? 'Could not reset PIN. Please try again.');
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

  function handleDeleteAccount() {
  Alert.alert(
    'Delete Account',
    'This permanently deletes your AidePoint account, including your profile, saved reports, and chat history. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          // Second confirmation -- this is destructive and irreversible,
          // so a single tap shouldn't be enough to trigger it.
          Alert.alert(
            'Are you absolutely sure?',
            'Type nothing needed -- tapping Delete below will erase your account immediately.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete My Account',
                style: 'destructive',
          onPress: async () => {
  try {
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;

    // Reports live locally in AsyncStorage, scoped per-user
    // (aidepoint_reports_v1:<userId>) -- must clear before logout()
    // invalidates access to user.id.
    await clearReports(user.id);

    await logout();
  } catch (err) {
    Alert.alert('Error', err.message ?? 'Could not delete your account. Please try again or contact support.');
  }
},
              },
            ],
          );
        },
      },
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

        <View style={styles.identityBlock}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.avatarBadge}
              onPress={handleChangeAvatar}
              disabled={uploadingAvatar}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
              )}
            </TouchableOpacity>
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
            label="Help Center" onPress={() => navigation.navigate('HelpCenter')}
          />
          <Divider />
          <Row
            icon="file-document-outline" iconColor="#F43F5E" iconBg="#FFF1F2"
            label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')}
          />
        </Section>

        <Section title="ACCOUNT ACTIONS">
          <Row
            icon="logout" iconColor="#F43F5E" iconBg="#FFF1F2"
            label="Sign Out"
            onPress={handleLogout}
          />
          <Divider />
          <Row
            icon="delete-outline" iconColor="#DC2626" iconBg="#FEF2F2"
            label="Delete Account"
            onPress={handleDeleteAccount}
          />
        </Section>

        <Text style={styles.version}>AIDEPOINT V1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

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

// ── Two things AuthContext still needs for this file to fully work ──
//
// 1. In hydrateUser(), add avatarUrl to the userData object built from
//    the profiles row:
//      avatarUrl: profile?.avatar_url || null,
//
// 2. In updateProfile(), add avatarUrl to the dbChanges mapping:
//      if (changes.avatarUrl !== undefined) dbChanges.avatar_url = changes.avatarUrl;
//    and to the optimistic `updated` object the same way storeImages is
//    handled there already.
//
// Also needs a `avatar_url` column on `profiles`, and a Supabase storage
// bucket called "avatars" — public read, write restricted to the user's
// own folder (storage policy checking auth.uid() against the first path
// segment, same pattern as scan-images probably already uses).
