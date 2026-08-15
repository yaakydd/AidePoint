import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { CONDITION_CONFIG } from '../utils/ReportUtils';
import { ReportStyles as styles } from '../styles/ReportStyles';


const AnemicCellIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#FEF2F2" />
    <Circle cx="18" cy="25" r="11" fill="#FCA5A5" stroke="#B91C1C" strokeWidth="1.5" />
    <Circle cx="18" cy="25" r="6.5" fill="#FEF2F2" />
    <Circle cx="38" cy="33" r="10" fill="#F87171" stroke="#B91C1C" strokeWidth="1.5" opacity="0.9" />
    <Circle cx="38" cy="33" r="6" fill="#FEF2F2" />
  </Svg>
);

const NormalIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#ECFDF5" />
    <Circle cx="20" cy="30" r="12" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.5" />
    <Circle cx="20" cy="30" r="5.5" fill="#D1FAE5" />
    <Circle cx="39" cy="23" r="10" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.5" opacity="0.9" />
    <Circle cx="39" cy="23" r="4.5" fill="#D1FAE5" opacity="0.9" />
  </Svg>
);


const UnknownIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#EBF8FF" />
    <Circle cx="20" cy="30" r="12" fill="#BFDBFE" stroke="#3182CE" strokeWidth="1.5" />
    <Circle cx="20" cy="30" r="5.5" fill="#DBEAFE" />
    <Circle cx="39" cy="23" r="10" fill="#93C5FD" stroke="#3182CE" strokeWidth="1.5" opacity="0.9" />
    <Circle cx="39" cy="23" r="4.5" fill="#DBEAFE" opacity="0.9" />
    <Circle cx="45" cy="12" r="7" fill="#3182CE" />
    <Path d="M45 8.5 v0.01 M45 11 v5.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const CONDITION_ICONS = {
  anemic: AnemicCellIcon,
  healthy: NormalIcon,
  unknown: UnknownIcon,
};

export const ConditionIcon = ({ condition, size = 56 }) => {
  const Icon = CONDITION_ICONS[condition] ?? NormalIcon;
  return <Icon size={size} />;
};

export const ConditionBadge = ({ condition }) => {
  const cfg = CONDITION_CONFIG?.[condition] ?? CONDITION_CONFIG?.healthy ?? {};

  return (
    <View style={[styles.badge, { backgroundColor: cfg.badgeBg ?? '#eee' }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.badgeDot ?? '#999' }]} />
      <Text style={[styles.badgeLabel, { color: cfg.badgeText ?? '#000' }]}>
        {String(cfg.label ?? 'Unknown')}
      </Text>
    </View>
  );
};