import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../assets/theme';
import { styles } from '../styles/PrivacyPolicyStyles';

const PLACEHOLDER_SECTIONS = [
  {
    title: 'Data We Collect',
    body: 'Placeholder : describe what patient and account data AidePoint collects (e.g. smear images when Save Scan Images is enabled, CBC estimates, account details).',
  },
  {
    title: 'How We Use Your Data',
    body: 'Placeholder : describe how scan results, chat history, and account data are used to provide the service.',
  },
  {
    title: 'Data Storage & Security',
    body: 'Placeholder : describe where data is stored (e.g. Supabase), retention periods per plan tier, and security measures.',
  },
  {
    title: 'Your Rights',
    body: 'Placeholder : describe how a user can request deletion of their data, disable image storage, or export their reports.',
  },
  {
    title: 'Contact',
    body: 'Placeholder : support@aidebot.gmail.com for any privacy-related questions.',
  },
];

const PrivacyPolicy = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last updated: Not yet published</Text>

        {PLACEHOLDER_SECTIONS.map((section) => (
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