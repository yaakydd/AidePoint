import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, Modal, Linking, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, HEADER } from '../assets/theme';
import { styles } from '../styles/HelpCenterStyles';
import Header from '../components/Header';

const FAQS = [
  {
    id: 'accuracy',
    q: 'How accurate is the anemia screening result?',
    a: 'AideBot\'s scan is a screening aid, not a lab diagnosis. Always confirm a result with a laboratory CBC test and clinical evaluation before treatment decisions.',
  },
  {
    id: 'scope',
    q: 'Does the scan check for malaria, sickle cell, or other conditions?',
    a: 'No, the model only screens for anemia risk based on red blood cell patterns. A "No Anemia" result does not rule out malaria, sickle cell disease, or any other blood condition.',
  },
  {
    id: 'unreliable',
    q: 'Why was my result marked as unreliable?',
    a: 'This usually means the smear image had a quality issue, that is poor lighting, low contrast or under/over-staining. Retake the photo following the in-app capture guide for a more reliable result.',
  },
  {
    id: 'pin',
    q: 'I forgot my Report PIN. What do I do?',
    a: 'Go to Profile then Reset Report PIN. You\'ll be asked to set a new 4-digit PIN the next time you open the Reports tab.',
  },
  {
    id: 'images',
    q: 'Are my patients\' smear images stored?',
    a: 'Only if you\'ve enabled "Save Scan Images" in Profile → Data & Privacy. Otherwise, images are analyzed and then discarded.',
  },
];

const HelpCenter = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [bugReport, setBugReport] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  const toggleFaq = (id) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const sendBugEmail = () => {
    if (!bugReport.trim()) {
      Alert.alert('Add a description', 'Please describe the issue before sending.');
      return;
    }

    const context =
      `Account: ${user?.name || 'Unknown'} (${user?.email || '—'})\n` +
      `Role: ${user?.role || '—'}\n` +
      `Hospital/Lab: ${user?.hospitalLab || '—'}\n\n` +
      `Issue description:\n${bugReport}`;

    const url = `mailto:support@aidebot.gmail.com?subject=Bug Report&body=${encodeURIComponent(context)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open email app.'));
    setBugModalVisible(false);
    setBugReport('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <Header
        left={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back-ios-new" size={HEADER.iconSize} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
        center={<Text style={styles.headerTitle}>Help Center</Text>}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.introCard}>
          <View style={styles.introIconBox}>
            <MaterialCommunityIcons name="lifebuoy" size={22} color={COLORS.primaryDark} />
          </View>
          <View style={styles.introTextBlock}>
            <Text style={styles.introTitle}>How can we help?</Text>
            <Text style={styles.introSub}>
              Browse common questions below, or reach out to our team directly.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>GET HELP</Text>

          <TouchableOpacity style={styles.row} onPress={() => setBugModalVisible(true)} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.dangerBg }]}>
              <MaterialCommunityIcons name="bug-outline" size={19} color={COLORS.danger} />
            </View>
            <Text style={styles.rowLabel}>Report a Bug</Text>
            <Ionicons name="chevron-forward" size={17} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('mailto:aidepoint171@gmail.com')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.infoBg }]}>
              <MaterialCommunityIcons name="email-outline" size={19} color={COLORS.info} />
            </View>
            <Text style={styles.rowLabel}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={17} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://wa.me/')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.successBg }]}>
              <MaterialCommunityIcons name="whatsapp" size={19} color={COLORS.success} />
            </View>
            <Text style={styles.rowLabel}>Chat With Us on WhatsApp</Text>
            <Ionicons name="chevron-forward" size={17} color={COLORS.border} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>FREQUENTLY ASKED QUESTIONS</Text>

          {FAQS.map((faq, index) => {
            const isOpen = expandedFaqId === faq.id;
            return (
              <View key={faq.id}>
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleFaq(faq.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestionText}>{faq.q}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.textMuted}
                    />
                  </View>
                  {isOpen && <Text style={styles.faqAnswerText}>{faq.a}</Text>}
                </TouchableOpacity>
                {index < FAQS.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <View style={styles.footerBlock}>
          <Text style={styles.footerText}>AidePoint V1.0.0</Text>
          <Text style={styles.footerText}>Made for lab technicians, by AidePoint</Text>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent
        visible={bugModalVisible}
        onRequestClose={() => setBugModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Report a Bug</Text>
            <Text style={styles.modalDescription}>
              Your account details will be attached automatically so our team has context.
            </Text>
            <TextInput
              style={styles.bugInput}
              placeholder="Describe the issue..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={bugReport}
              onChangeText={setBugReport}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setBugModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSend]}
                onPress={sendBugEmail}
              >
                <Text style={styles.modalButtonTextSend}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HelpCenter;