// components/Conditions.js
//
// The single shared source for condition icons and badges. ReportsScreen.js
// used to keep its own duplicate copy of these same icons -- that
// duplication is exactly how a stale disease-category list could drift out
// of sync in one file while getting fixed in another. Everything that
// needs a condition icon or badge should import from here.

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { CONDITION_CONFIG } from '../utils/ReportUtils';
import { ReportStyles as styles } from '../styles/ReportStyles';

// This app reports a binary anemia screening result (anemic vs healthy),
// not a specific disease type -- the earlier anemia-type classifier
// (sickle cell, malaria, thalassemia, etc.) was removed from the backend
// after its training data turned out to be threshold-derived rather than
// independently diagnosed. These two icons are a generic visual for
// "abnormal red cell appearance" and "normal red cell appearance," not a
// diagnosis of any specific condition.

const AnemicCellIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#FFFBEB" />
    {/* Hypochromic cell -- ring of colour, enlarged pale centre, the
        general visual pattern the model's morphology flags describe */}
    <Circle cx="18" cy="25" r="11" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" />
    <Circle cx="18" cy="25" r="6.5" fill="#FFFBEB" />
    <Circle cx="38" cy="33" r="10" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" opacity="0.9" />
    <Circle cx="38" cy="33" r="6" fill="#FFFBEB" />
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
const NoAnemiaIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#EBF8FF" />
    <Circle cx="20" cy="30" r="12" fill="#BEE3F8" stroke="#3182CE" strokeWidth="1.5" />
    <Circle cx="20" cy="30" r="5.5" fill="#EBF8FF" />
    <Circle cx="39" cy="23" r="10" fill="#90CDF4" stroke="#3182CE" strokeWidth="1.5" opacity="0.9" />
    <Circle cx="39" cy="23" r="4.5" fill="#EBF8FF" opacity="0.9" />
  </Svg>
);

const CONDITION_ICONS = {
  anemic: AnemicCellIcon,
  healthy: NormalIcon,
  no_anemia: NoAnemiaIcon,
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