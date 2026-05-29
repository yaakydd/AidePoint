// screens/ProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Switch, StyleSheet, StatusBar, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../assets/theme';

// ─── HELPERS ────────────────────────────────────────────────

// "Joshua Antwi" → "JA"
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

const ROLE_DISPLAY = {
  lab_technician:        'Lab Technician',
  senior_lab_technician: 'Senior Lab Technician',
};

// ─── COMPONENT ──────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateProfile, isOnline } = useAuth();

  const [storeImages, setStoreImages] = useState(user?.storeImages ?? false);
  const [saving, setSaving] = useState(false);

  const initials  = getInitials(user?.name);
  const roleLabel = ROLE_DISPLAY[user?.role] || 'Lab Technician';

  // ── Toggle image storage ────────────────────────────────
  async function handleToggle(newValue) {
    const prev = storeImages;
    setStoreImages(newValue); // update UI immediately

    setSaving(true);
    const result = await updateProfile({ storeImages: newValue });
    setSaving(false);

    if (!result.success) {
      setStoreImages(prev); // revert if it failed
      Alert.alert('Error', result.error || 'Could not save preference.');
    }
  }

  // ── Logout confirmation ─────────────────────────────────
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

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* ── Avatar card ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Unknown'}</Text>
          <Text style={styles.userRole}>{roleLabel}</Text>
          <View style={styles.verifiedBadge}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={13}
              color="#0EA5E9"
            />
            <Text style={styles.verifiedText}>AidePoint Verified</Text>
          </View>
        </View>

        {/* ── Account Details ── */}
        <SectionCard title="ACCOUNT DETAILS">
          <Row
            iconBg="#EFF6FF"
            icon={<MaterialCommunityIcons name="email-outline" size={19} color="#3B82F6" />}
            label="Email"
            value={user?.email || '—'}
          />
          <Divider />
          <Row
            iconBg="#F0FDF4"
            icon={<MaterialCommunityIcons name="office-building-outline" size={19} color="#22C55E" />}
            label="Hospital / Lab"
            value={user?.hospitalLab || 'Not set'}
          />
        </SectionCard>

        {/* ── Settings & Preferences ── */}
        <SectionCard title="SETTINGS & PREFERENCES">
          <Row
            iconBg="#FFF7ED"
            icon={<Ionicons name="notifications-outline" size={19} color="#F97316" />}
            label="Notifications"
            onPress={() => {}}
          />
          <Divider />
          <Row
            iconBg="#F5F3FF"
            icon={<Ionicons name="globe-outline" size={19} color="#8B5CF6" />}
            label="Language"
            value="English (US)"
            onPress={() => {}}
          />
          <Divider />
          <Row
            iconBg="#F0F9FF"
            icon={<MaterialCommunityIcons name="shield-lock-outline" size={19} color="#0EA5E9" />}
            label="Security & Password"
            value="Change password"
            onPress={() => navigation.navigate('ForgotPassword')}  
          />
          <Divider />

          {/* Save Scan Images toggle */}
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#FDF4FF' }]}>
              <MaterialCommunityIcons name="image-outline" size={19} color="#A855F7" />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.rowLabel}>Save Scan Images</Text>
              <Text style={styles.rowSub}>
                {storeImages
                  ? 'Images are being stored securely'
                  : 'Images are not stored after analysis'}
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

          {/* Subtle offline hint under toggle when offline */}
          {!isOnline && (
            <Text style={styles.offlineNote}>
              Offline — preference saved locally, will sync when connected
            </Text>
          )}
        </SectionCard>

        {/* ── Support ── */}
        <SectionCard title="SUPPORT">
          <Row
            iconBg="#F0FDF4"
            icon={<Ionicons name="help-circle-outline" size={19} color="#22C55E" />}
            label="Help Center"
            onPress={() => {}}
          />
          <Divider />
          <Row
            iconBg="#FFF1F2"
            icon={<MaterialCommunityIcons name="file-document-outline" size={19} color="#F43F5E" />}
            label="Privacy Policy"
            onPress={() => {}}
          />
          <Divider />
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF1F2' }]}>
              <MaterialCommunityIcons name="logout" size={19} color="#EF4444" />
            </View>
            <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Logout</Text>
          </TouchableOpacity>
        </SectionCard>

        <Text style={styles.version}>AIDEPOINT V2.4.1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ iconBg, icon, label, value, onPress }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
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

// ─── STYLES ────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Avatar section
  avatarSection: {
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  userRole: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '500',
    marginBottom: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  verifiedText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },

  // Cards / sections
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    color: '#94A3B8',
    maxWidth: 160,
    marginRight: 4,
  },
  rowSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 64,
  },

  offlineNote: {
    fontSize: 11,
    color: '#F97316',
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -4,
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
    letterSpacing: 1.2,
    fontWeight: '600',
    paddingTop: 8,
    paddingBottom: 20,
  },
});
