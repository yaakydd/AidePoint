// components/GoogleSignInButton.js
//
// Reusable Google sign-in button.
// Drop it into SignIn and SignUp screens.
// The hook handles everything — just render this component.

import React from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet, Platform,
} from 'react-native';
import { GoogleSignIn } from '../hooks/GoogleSignIn';
import { COLORS } from '../assets/theme';

// Google's brand colors — these are required by Google's branding guidelines.
const G_RED    = '#EA4335';
const G_BLUE   = '#4285F4';
const G_YELLOW = '#FBBC05';
const G_GREEN  = '#34A853';

export function Button({ label = 'Continue with Google' }) {
  const { promptAsync, isReady } = GoogleSignIn();

  return (
    <TouchableOpacity
      style={[styles.button, !isReady && styles.buttonDisabled]}
      onPress={() => promptAsync()}
      disabled={!isReady}
      activeOpacity={0.85}
    >
      {/* Google "G" logo made from four colored squares */}
      <View style={styles.gLogo}>
        <View style={styles.gRow}>
          <View style={[styles.gDot, { backgroundColor: G_BLUE   }]} />
          <View style={[styles.gDot, { backgroundColor: G_RED    }]} />
        </View>
        <View style={styles.gRow}>
          <View style={[styles.gDot, { backgroundColor: G_GREEN  }]} />
          <View style={[styles.gDot, { backgroundColor: G_YELLOW }]} />
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#FFFFFF',
    borderWidth:     1.5,
    borderColor:     '#E2E8F0',
    borderRadius:    14,
    paddingVertical: 14,
    gap:             10,
    // Subtle shadow so it looks like a distinct button
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  buttonDisabled: { opacity: 0.55 },

  gLogo: { flexDirection: 'column', gap: 2 },
  gRow:  { flexDirection: 'row',    gap: 2 },
  gDot:  { width: 6, height: 6, borderRadius: 1 },

  label: {
    fontSize:   15,
    fontWeight: '600',
    color:      '#374151',
  },
});