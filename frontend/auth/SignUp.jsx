// screens/auth/SignUp.js
//
// Hospital/lab picker:
//   - Loads from ghana_hospitals table on mount
//   - User types → list filters live (fuzzy prefix match)
//   - "Other" row lets user type a custom name
//   - Selected value is saved to profiles.hospital_lab via raw_user_meta_data

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
  StatusBar, FlatList, Keyboard,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth }   from '../context/AuthContext';
import { supabase }  from '../utils/supabase';
import { COLORS }    from '../assets/theme';

// ─── PASSWORD STRENGTH ──────────────────────────────────────

const PASSWORD_CHECKS = [
  { key: 'length',  label: 'At least 8 characters',         test: p => p.length >= 8 },
  { key: 'upper',   label: 'At least one uppercase letter',  test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'At least one number',            test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'At least one special character', test: p => /[@#!$%^&*()\-_=+]/.test(p) },
];

function getStrength(pwd) {
  const passed = PASSWORD_CHECKS.filter(c => c.test(pwd)).length;
  if (passed <= 1) return { label: 'Weak',        color: '#EF4444', score: 1 };
  if (passed === 2) return { label: 'Fair',        color: '#F97316', score: 2 };
  if (passed === 3) return { label: 'Strong',      color: '#84CC16', score: 3 };
  return              { label: 'Very Strong',      color: '#10B981', score: 4 };
}

// ─── COMPONENT ──────────────────────────────────────────────

export default function SignUp() {
  const navigation = useNavigation();
  const { register, authError, clearError } = useAuth();

  // ── Form fields ──────────────────────────────────────────
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Hospital picker state ────────────────────────────────
  const [hospitalQuery,    setHospitalQuery]    = useState('');   // typed text
  const [hospitalSelected, setHospitalSelected] = useState('');   // confirmed value
  const [hospitalList,     setHospitalList]     = useState([]);   // full DB list
  const [filteredList,     setFilteredList]     = useState([]);   // live-filtered
  const [showDropdown,     setShowDropdown]     = useState(false);
  const [showCustomInput,  setShowCustomInput]  = useState(false);
  const [customHospital,   setCustomHospital]   = useState('');
  const [hospitalsLoading, setHospitalsLoading] = useState(true);

  // ── UI state ─────────────────────────────────────────────
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);

  const strength  = getStrength(password);
  const canSubmit = strength.score >= 3 && !loading;

  // ── Load hospital list once ──────────────────────────────
  useEffect(() => {
    async function fetchHospitals() {
      const { data, error } = await supabase
        .from('ghana_hospitals')
        .select('name, city, type')
        .order('name');

      if (!error && data) setHospitalList(data);
      setHospitalsLoading(false);
    }
    fetchHospitals();
  }, []);

  // ── Live filter as user types ────────────────────────────
  useEffect(() => {
    if (!hospitalQuery.trim()) {
      setFilteredList(hospitalList.slice(0, 8)); // show first 8 when empty
      return;
    }
    const q = hospitalQuery.toLowerCase();
    const filtered = hospitalList.filter(h =>
      h.name.toLowerCase().includes(q) ||
      (h.city && h.city.toLowerCase().includes(q))
    );
    setFilteredList(filtered.slice(0, 10));
  }, [hospitalQuery, hospitalList]);

  // ── Select a hospital from dropdown ─────────────────────
  function handleSelectHospital(hospital) {
    if (hospital.name === 'Other') {
      setShowCustomInput(true);
      setShowDropdown(false);
      setHospitalQuery('');
      setHospitalSelected('');
      return;
    }
    setHospitalSelected(hospital.name);
    setHospitalQuery(hospital.name);
    setShowDropdown(false);
    setShowCustomInput(false);
    clearField('hospital');
    Keyboard.dismiss();
  }

  function handleConfirmCustom() {
    const val = customHospital.trim();
    if (!val) return;
    setHospitalSelected(val);
    setHospitalQuery(val);
    setShowCustomInput(false);
    clearField('hospital');
  }

  // The effective hospital value for submission
  const effectiveHospital = showCustomInput
    ? customHospital.trim()
    : hospitalSelected;

  // ── Validation ───────────────────────────────────────────
  function validate() {
    const e = {};

    if (!name.trim())              e.name = 'Name is required';
    if (!email.trim())             e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                                   e.email = 'Invalid email address';
    if (!password)                 e.password = 'Password is required';
    else if (strength.score < 3)   e.password = 'Password is too weak';
    if (password !== confirmPassword)
                                   e.confirmPassword = 'Passwords do not match';
    if (!effectiveHospital)        e.hospital = 'Hospital / Lab is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearField(key) {
    setErrors(prev => ({ ...prev, [key]: null }));
    clearError?.();
  }

  // ── Submit ───────────────────────────────────────────────
  async function handleSignup() {
    if (!validate() || loading) return;

    setLoading(true);
    clearError?.();

    try {
      const result = await register({
        name,
        email,
        password,
        hospitalLab: effectiveHospital,
      });

      if (!result.success) {
        setErrors(prev => ({ ...prev, email: result.error }));
        return;
      }

      if (result.needsVerification) {
        navigation.navigate('VerifyEmail', { email: result.email });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="microscope" size={28} color={COLORS.primary} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join AidePoint to start scanning</Text>
        </View>

        {/* Auth error */}
        {!!authError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        {/* Name */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          placeholder="e.g. Kwame Mensah"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={t => { setName(t); clearField('name'); }}
          style={[styles.input, errors.name && styles.inputError]}
        />
        {errors.name && <Text style={styles.err}>{errors.name}</Text>}

        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={t => { setEmail(t); clearField('email'); }}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, errors.email && styles.inputError]}
        />
        {errors.email && <Text style={styles.err}>{errors.email}</Text>}

        {/* ── Hospital / Lab Picker ── */}
        <Text style={styles.label}>Hospital / Lab <Text style={styles.required}>*</Text></Text>

        <View style={styles.hospitalWrapper}>
          {/* Search input */}
          <View style={[
            styles.hospitalInputRow,
            errors.hospital && styles.inputError,
            showDropdown && styles.hospitalInputFocused,
          ]}>
            <MaterialCommunityIcons
              name="hospital-building"
              size={18}
              color={hospitalSelected ? COLORS.primary : '#9CA3AF'}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder={hospitalsLoading ? 'Loading hospitals…' : 'Search hospital or lab'}
              placeholderTextColor="#9CA3AF"
              value={hospitalQuery}
              onChangeText={t => {
                setHospitalQuery(t);
                setHospitalSelected(''); // clear confirmed selection on re-type
                setShowDropdown(true);
                setShowCustomInput(false);
                clearField('hospital');
              }}
              onFocus={() => setShowDropdown(true)}
              style={styles.hospitalInput}
              editable={!hospitalsLoading}
            />
            {hospitalSelected ? (
              <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            ) : (
              <MaterialCommunityIcons
                name={showDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#9CA3AF"
              />
            )}
          </View>

          {/* Dropdown list */}
          {showDropdown && filteredList.length > 0 && (
            <View style={styles.dropdown}>
              {filteredList.map((hospital, idx) => (
                <TouchableOpacity
                  key={hospital.name}
                  style={[
                    styles.dropdownItem,
                    idx < filteredList.length - 1 && styles.dropdownDivider,
                  ]}
                  onPress={() => handleSelectHospital(hospital)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropdownName}>{hospital.name}</Text>
                    {hospital.city && (
                      <Text style={styles.dropdownCity}>{hospital.city}</Text>
                    )}
                  </View>
                  {hospital.type && hospital.name !== 'Other' && (
                    <View style={[styles.typePill, getTypePillStyle(hospital.type)]}>
                      <Text style={[styles.typePillText, getTypePillStyle(hospital.type)]}>
                        {hospital.type}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Custom hospital input (shown when "Other" selected) */}
          {showCustomInput && (
            <View style={styles.customBox}>
              <Text style={styles.customLabel}>Enter your hospital or lab name:</Text>
              <View style={styles.customRow}>
                <TextInput
                  placeholder="e.g. My City Lab"
                  placeholderTextColor="#9CA3AF"
                  value={customHospital}
                  onChangeText={setCustomHospital}
                  style={styles.customInput}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.customConfirmBtn}
                  onPress={handleConfirmCustom}
                >
                  <Text style={styles.customConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {errors.hospital && (
          <Text style={[styles.err, { marginTop: 4 }]}>{errors.hospital}</Text>
        )}

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={[styles.passBox, errors.password && styles.inputError]}>
          <TextInput
            placeholder="Create a strong password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            style={styles.passInput}
          />
          <TouchableOpacity onPress={() => setShowPass(p => !p)}>
            <Feather name={showPass ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Strength bars */}
        {password.length > 0 && (
          <>
            <View style={styles.barRow}>
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    { backgroundColor: i <= strength.score ? strength.color : '#E5E7EB' },
                  ]}
                />
              ))}
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
            <View style={styles.checkList}>
              {PASSWORD_CHECKS.map(c => (
                <Text
                  key={c.key}
                  style={[styles.check, c.test(password) ? styles.checkPass : styles.checkFail]}
                >
                  {c.test(password) ? '✓' : '✗'}  {c.label}
                </Text>
              ))}
            </View>
          </>
        )}
        {errors.password && <Text style={styles.err}>{errors.password}</Text>}

        {/* Confirm password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={[styles.passBox, errors.confirmPassword && styles.inputError]}>
          <TextInput
            placeholder="Re-enter your password"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            style={styles.passInput}
          />
          <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
            <Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.err}>{errors.confirmPassword}</Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          disabled={!canSubmit}
          onPress={handleSignup}
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        {/* Sign in link */}
        <TouchableOpacity
          style={styles.signinRow}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.signinText}>
            Already have an account?{' '}
            <Text style={styles.signinLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── HELPERS ────────────────────────────────────────────────

function getTypePillStyle(type) {
  const map = {
    teaching:   { backgroundColor: '#EFF6FF', color: '#1D4ED8' },
    regional:   { backgroundColor: '#F0FDF4', color: '#166534' },
    district:   { backgroundColor: '#FFF7ED', color: '#9A3412' },
    polyclinic: { backgroundColor: '#F5F3FF', color: '#6D28D9' },
    private:    { backgroundColor: '#FFF1F2', color: '#9F1239' },
    lab:        { backgroundColor: '#F0FDFA', color: '#0F766E' },
  };
  return map[type] ?? { backgroundColor: '#F1F5F9', color: '#475569' };
}

// ─── STYLES ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#fff' },
  container:  { padding: 24, paddingBottom: 48 },

  header:     { marginTop: 20, marginBottom: 28 },
  title:      { fontSize: 26, fontWeight: '700', color: '#111827', marginTop: 10 },
  subtitle:   { fontSize: 14, color: '#6B7280', marginTop: 4 },

  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  required:   { color: '#EF4444' },

  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 13,
    borderRadius: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#EF4444' },

  // ── Hospital picker ─────────────────────────────────────
  hospitalWrapper:   { position: 'relative', zIndex: 100 },
  hospitalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FAFAFA',
  },
  hospitalInputFocused: { borderColor: COLORS.primary },
  hospitalInput:  { flex: 1, fontSize: 15, color: '#111827' },

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0, right: 0,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 280,
    overflow: 'hidden',
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  dropdownCity: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: 8,
  },
  typePillText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  customBox: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customLabel: { fontSize: 13, color: '#374151', marginBottom: 8 },
  customRow:   { flexDirection: 'row', gap: 8 },
  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
  },
  customConfirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  customConfirmText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // ── Password ────────────────────────────────────────────
  passBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  passInput:   { flex: 1, fontSize: 15, color: '#111827' },
  barRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  bar:         { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6, minWidth: 68 },

  checkList:   { marginTop: 8, gap: 3 },
  check:       { fontSize: 12, marginLeft: 2 },
  checkPass:   { color: '#10B981' },
  checkFail:   { color: '#9CA3AF' },

  // ── Submit ──────────────────────────────────────────────
  btn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  signinRow:   { marginTop: 20, alignItems: 'center' },
  signinText:  { fontSize: 14, color: '#6B7280' },
  signinLink:  { color: COLORS.primary, fontWeight: '600' },

  err:       { color: '#EF4444', fontSize: 12, marginTop: 3 },
  errorBox:  { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#EF4444', fontSize: 13 },
});