import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Switch, StatusBar, Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { styles } from '../styles/ProfileStyles';
import { clearPin, endSession } from '../utils/reportPin';
import { deleteAllScanImages } from '../utils/scanStorage';
import { clearReports } from '../utils/ReportUtils';
import { clearAllSessions } from '../utils/chatstorage';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { HEADER, COLORS } from '../assets/theme';
import { getTabBarHeight } from '../navigation/MainAppNavigator';
import DeleteAccountModal from '../components/DeleteAccountModal';

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
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, deleteAccountSignOut } = useAuth();

  const [storeImages, setStoreImages] = useState(user?.storeImages ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initials  = getInitials(user?.name);
  const roleLabel = ROLE_DISPLAY[user?.role] || 'Lab Technician';

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
      return;
    }

    if (prev === true && newValue === false) {
      try {
        await deleteAllScanImages(user.id);
      } catch (err) {
        console.error('Failed to delete stored scan images:', err);
        Alert.alert(
          'Preference Saved',
          "Your setting was saved, but we couldn't confirm your previously stored images were deleted. You can try toggling this off again later, or contact support if it persists."
        );
      }
    }
  }

  async function handleChangeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Allow photo library access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);

      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const saveResult = await updateProfile({ avatarUrl: publicUrl });
      if (!saveResult.success) throw new Error(saveResult.error);

    } catch (err) {
      console.error('Avatar upload failed:', err);
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

  // Step 1 of 2: initial confirmation dialog. Only on OK do we move to
  // step 2 (the type-DELETE modal) — tapping "Delete Account" no longer
  // jumps straight to that modal.
  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', style: 'destructive', onPress: () => setShowDeleteModal(true) },
      ],
    );
  }

  // Step 2 of 2: called by DeleteAccountModal once the user has typed
  // DELETE and confirmed.
  async function confirmDeleteAccount() {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      // 1. Clean up storage FIRST — deleteAllScanImages needs a valid
      //    Supabase session/JWT under RLS, which won't exist after the
      //    auth user is deleted in step 2. A storage failure here is
      //    logged but does not block account deletion.
      try {
        await deleteAllScanImages(user.id);
      } catch (storageErr) {
        console.error('Failed to delete scan images before account deletion:', storageErr);
      }

      // 2. Invoke the edge function to delete the auth user
      //    (and associated DB rows, per the delete-account function).
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;

      // 3. Close modal, then clear local auth state / navigate to auth stack.
      setShowDeleteModal(false);
      await deleteAccountSignOut();
    } catch (err) {
      console.error('Account deletion failed:', err);
      Alert.alert(
        'Something went wrong',
        "We couldn't delete your account. Please try again or contact support."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Header
        left={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back-ios-new" size={HEADER.iconSize} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
        center={<Text style={styles.headerTitle}>Account</Text>}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getTabBarHeight(insets) + 24 },
        ]}
      >

        <View style={styles.identityBlock}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
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
                <MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.identityInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Unknown'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user?.email || '—'}</Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {roleLabel}{user?.hospitalLab ? ` · ${user.hospitalLab}` : ''}
            </Text>

            <View style={styles.identityMetaRow}>
              <View style={[styles.tierPill, { backgroundColor: `${tierColor}18`, borderColor: tierColor }]}>
                <MaterialCommunityIcons name="crown-outline" size={12} color={tierColor} />
                <Text style={[styles.tierPillText, { color: tierColor }]}>{tierLabel}</Text>
              </View>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.85}
              >
                <Text style={styles.manageBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
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
            onPress={() => navigation.navigate('ChangePassword')}
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

      <DeleteAccountModal
        visible={showDeleteModal}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
      />
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
