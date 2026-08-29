import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, scale } from '../assets/theme';

export default function DeleteAccountModal({ visible, isDeleting, onCancel, onConfirm }) {
  const [text, setText] = useState('');
  const confirmed = text.trim().toUpperCase() === 'DELETE';

  function handleCancel() {
    if (isDeleting) return;
    setText('');
    onCancel();
  }

  function handleConfirm() {
    if (!confirmed || isDeleting) return;
    onConfirm();
    // Deliberately not clearing `text` here — if onConfirm fails,
    // ProfileScreen keeps the modal open and the user shouldn't
    // have to retype DELETE to retry.
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Are you absolutely sure?</Text>
          <Text style={styles.body}>
            This permanently erases your account and all associated data. This cannot be undone.
          </Text>
          <Text style={styles.label}>Type DELETE to confirm.</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            autoCapitalize="characters"
            placeholder="DELETE"
            placeholderTextColor={COLORS.textMuted}
            editable={!isDeleting}
            style={styles.input}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleCancel} disabled={isDeleting}>
              <Text style={[styles.cancel, isDeleting && styles.disabled]}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!confirmed || isDeleting}
              onPress={handleConfirm}
              style={styles.confirmBtn}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Text style={[styles.delete, !confirmed && styles.disabled]}>
                  DELETE MY ACCOUNT
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  title: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.lg,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  body: {
    fontFamily: FONTS.family.regular,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm * FONTS.normal,
    marginBottom: SPACING.lg,
  },
  label: {
    fontFamily: FONTS.family.semibold,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontFamily: FONTS.family.regular,
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceAlt,
    marginBottom: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  confirmBtn: {
    minWidth: scale(130),
    alignItems: 'flex-end',
  },
  cancel: {
    fontFamily: FONTS.family.semibold,
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  delete: {
    fontFamily: FONTS.family.bold,
    fontSize: FONTS.sm,
    color: COLORS.danger,
  },
  disabled: {
    opacity: 0.4,
  },
});