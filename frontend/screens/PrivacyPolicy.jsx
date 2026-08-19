import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, HEADER } from '../assets/theme';
import { styles } from '../styles/PrivacyPolicyStyles';
import Header from '../components/Header';

const PRIVACY_SECTIONS = [
  {
    title: 'Data We Collect',
    body: 'To provide blood smear screening, AidePoint collects: your account details (name, email, hospital/clinic affiliation) via Supabase Auth; blood smear images, but only if you enable "Save Scan Images" during setup — if you decline, images are used solely for AI analysis and discarded immediately after processing; CBC estimates and anemia risk classifications generated for each scan; your chat history with AideBot, including any messages you send; and app usage data such as scan counts and daily AideBot message usage, used to enforce your plan\'s limits.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Scan images (when saved) are processed by our AI model to generate CBC estimates and anemia risk classifications, which are saved to your report history for later reference and patient lookup. Chat messages you send to AideBot are used to generate responses via Google Gemini and, on higher-tier plans, may reference your saved scan results to give more specific answers. Account details are used for authentication, plan management, and support communication. We do not sell your data or use it for advertising.',
  },
  {
    title: 'Data Storage & Security',
    body: 'All data is stored in Supabase, with images kept in a private, encrypted storage bucket that is never shared with third parties. An audit trail is kept for every scan (including model confidence and review flags) so results can be reviewed and verified. Data retention depends on your subscription tier: Basic keeps 7 days of chat history and 14 days of report history; Max keeps 30 days of chat history and 90 days of report history; Pro keeps 1 year of both. AidePoint is an online-only service — data is not stored locally on your device beyond your current session.',
  },
  {
    title: 'Your Rights',
    body: 'You can change your image storage preference at any time from Profile → Data & Privacy — this takes effect on your next scan. You can clear your AideBot chat history from within the chat screen. To request full deletion of your account and associated data, or to export your saved reports, contact us using the details below and we will act on your request as soon as possible.',
  },
  {
    title: 'Contact',
    body: 'For any privacy-related questions or data requests, reach us at support@aidepoint.app.',
  },
];

const PrivacyPolicy = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        left={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={HEADER.iconSize} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
        center={<Text style={styles.headerTitle}>Privacy Policy</Text>}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last updated: August 19, 2026</Text>

        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicy;