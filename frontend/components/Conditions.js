// components/Conditions.js
//
// The single shared source for condition icons and badges. ReportsScreen.js
// used to keep its own duplicate copy of these same icons -- that
// duplication is exactly how a stale disease-category list could drift out
// of sync in one file while getting fixed in another. Everything that
// needs a condition icon or badge should import from here.

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { CONDITION_CONFIG } from '../utils/ReportUtils';
import { ReportStyles as styles } from '../styles/ReportStyles';

// This app reports a binary anemia screening result (anemic vs not
// anemic), not a specific disease type -- the earlier anemia-type
// classifier (sickle cell, malaria, thalassemia, etc.) was removed from
// the backend after its training data turned out to be threshold-derived
// rather than independently diagnosed. These icons are a generic visual
// for "abnormal red cell appearance" (anemic), "normal red cell
// appearance, nothing else flagged" (healthy), and "not anemic, but
// something else was noted -- flagged morphology or an unreliable-result
// warning" (unknown) -- not a diagnosis of any specific condition.
// Keys here must match CONDITION_CONFIG in utils/ReportUtils.js exactly
// ('anemic' | 'healthy' | 'unknown') -- that file is the source of truth
// for which buckets exist.

const AnemicCellIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#FEF2F2" />
    {/* Hypochromic cell -- ring of colour, enlarged pale centre, the
        general visual pattern the model's morphology flags describe.
        FIXED: was using the amber/yellow palette ('info' colours),
        which visually contradicted CONDITION_CONFIG.anemic's severity
        of 'red' -- the badge text/dot next to this icon were already
        correctly red, only the icon itself was mismatched. */}
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

// Same round, non-alarming cell shapes as NormalIcon -- flagged morphology
// or an unreliable result isn't a "danger" result the way anemic is, but
// it's also not a clean "all clear" -- in the app's blue/info palette
// instead of green, plus a small info marker, this visually says "worth a
// second look" without borrowing red's danger association or green's
// all-clear association.
const UnknownIcon = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56">
    <Rect width="56" height="56" rx="14" fill="#EBF8FF" />
    <Circle cx="20" cy="30" r="12" fill="#BFDBFE" stroke="#3182CE" strokeWidth="1.5" />
    <Circle cx="20" cy="30" r="5.5" fill="#DBEAFE" />
    <Circle cx="39" cy="23" r="10" fill="#93C5FD" stroke="#3182CE" strokeWidth="1.5" opacity="0.9" />
    <Circle cx="39" cy="23" r="4.5" fill="#DBEAFE" opacity="0.9" />
    {/* small "i" info marker, top-right, signals "see findings" without
        implying a diagnosis or an alarm */}
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