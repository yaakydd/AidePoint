import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HEADER } from '../assets/theme';

export default function Header({ left, center, right, style, contentStyle }) {
  return (
    <View style={[styles.header, style]}>
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
    height: HEADER.height,
    backgroundColor: HEADER.backgroundColor,
    paddingHorizontal: HEADER.paddingHorizontal,
    borderBottomWidth: HEADER.borderBottomWidth,
    borderBottomColor: HEADER.borderBottomColor,
    ...HEADER.shadow,
  },

  content: {
    flex: 1,
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
