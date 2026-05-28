import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function OfflineBanner() {
  const { isOnline } = useAuth();

  // If online, render nothing at all
  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        No internet connection — some features may be limited
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});