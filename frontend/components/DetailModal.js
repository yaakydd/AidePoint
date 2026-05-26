// ─────────────────────────────────────────────────────────────
// DETAIL MODAL (BOTTOM SHEET)
// ─────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';

import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';

import { ReportStyles as styles } from '../styles/ReportStyles';
import { CONDITION_CONFIG } from '../utils/ReportUtils'; 
import { ConditionIcon, ConditionBadge } from './Conditions';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.82;

// ─── HELPERS (MOVED OUTSIDE COMPONENT) ─────────────────────────
const getFullDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─────────────────────────────────────────────────────────────
const DetailModal = ({ report, visible, onClose }) => {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!report) return null;

  const cfg =
    CONDITION_CONFIG?.[report.condition] ??
    CONDITION_CONFIG?.normal ??
    { label: 'Unknown' };

  // ─── SAFE ROW COMPONENT (FIX FOR TEXT ERROR) ───────────────
  const DetailRow = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value ?? '-')}</Text>
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: MODAL_MAX_HEIGHT,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <ConditionIcon condition={report.condition} size={64} />

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sheetName}>{report.patientName}</Text>
              <Text style={styles.sheetId}>Scan #{report.patientId}</Text>
              <ConditionBadge condition={report.condition} />
            </View>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionHeading}>Date & Time</Text>

            <DetailRow
              label="Date"
              value={getFullDate(report.createdAt)}
            />
            <DetailRow
              label="Time"
              value={getTime(report.createdAt)}
            />

            <Text style={styles.sectionHeading}>AI Analysis</Text>

            <DetailRow label="Condition" value={cfg.label} />
            <DetailRow
              label="Confidence"
              value={`${Number(report.confidence || 0).toFixed(1)}%`}
            />
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close Report</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default DetailModal;