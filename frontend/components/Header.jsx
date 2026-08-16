import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER } from '../assets/theme';

export default function Header({ left, center, right, style, contentStyle }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }, style]}>
      <View style={[styles.content, contentStyle]}>
        <View style={styles.side}>{left}</View>
        <View style={styles.center}>{center}</View>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: HEADER.backgroundColor,
    paddingHorizontal: HEADER.paddingHorizontal,
    borderBottomWidth: HEADER.borderBottomWidth,
    borderBottomColor: HEADER.borderBottomColor,
    ...HEADER.shadow,
    zIndex: 20,
    elevation: 20,
    overflow: 'visible',
  },

  content: {
    height: HEADER.height,
    flexDirection: 'row',
    alignItems: 'center',
  },

  side: {
    minWidth: HEADER.iconTouchTarget,
    justifyContent: 'center',
  },

  sideRight: {
    alignItems: 'flex-end',
  },

  center: {
    flex: 1,
    marginHorizontal: HEADER.contentGap,
    justifyContent: 'center',
  },
});