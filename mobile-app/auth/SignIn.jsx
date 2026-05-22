// screens/auth/SignUp.js

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

// ── FIX: import useAuth hook ──────────────────────────────────────────────
// register is a NEW function added to AuthContext for Supabase signup.
// login is still here too in case we need it after registration.
import { useAuth } from "../context/AuthContext";

const SignUp = () => {
  const [fullName, setFullName]               = useState("");
  const [professionalId, setProfessionalId]   = useState("");
  const [institution, setInstitution]         = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [errors, setErrors]                   = useState({});

  // ── FIX: use the register function from AuthContext ───────────────────
  // register({ email, password, fullName, userType }) calls
  // supabase.auth.signUp() and returns { success, requiresConfirmation?, error? }
  const { register } = useAuth();
  const navigation = useNavigation();

  const route = useRoute();
  const userType = route.params?.userType ?? "hospital";
  const isHospital = userType === "hospital";

  // ─── VALIDATION ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    if (!fullName.trim()) {
      e.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      e.fullName = "Name must be at least 2 characters";
    }

    if (isHospital) {
      if (!professionalId.trim()) e.professionalId = "Professional ID is required";
      if (!institution.trim())    e.institution    = "Institution name is required";
    }

    if (!email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = "Enter a valid email address";
    }

    if (!password) {
      e.password = "Password is required";
    } else if (password.length < 8) {
      e.password = "Must be at least 8 characters";
    }

    if (!confirmPassword) {
      e.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  // ─── REGISTER HANDLER ────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // ── REAL SUPABASE CALL ──────────────────────────────────────────────
      // register() inside AuthContext calls supabase.auth.signUp().
      // It passes fullName and userType as user_metadata so the
      // on_auth_user_created trigger can write them to the profiles table.
      //
      // For hospital users: professionalId and institution are stored for
      // reference but Supabase auth itself just uses email + password.
      // Hospital-specific validation (domain check) comes later via hospital-sso.
      const result = await register({
        email,
        password,
        fullName,
        userType,
      });

      if (!result.success) {
        // Show the Supabase error message (e.g. "User already registered")
        setErrors({ email: result.error });
        return;
      }

      if (result.requiresConfirmation) {
        // Email confirmation is turned ON in Supabase settings.
        // User needs to check their inbox before they can log in.
        Alert.alert(
          "Check your email",
          `We've sent a confirmation link to ${email.trim().toLowerCase()}. Click it to activate your account, then sign in.`,
          [{ text: "Go to Sign In", onPress: () => navigation.navigate("SignIn") }]
        );
      }
      // If requiresConfirmation = false:
      // onAuthStateChange fires SIGNED_IN, setUser runs in AuthContext,
      // AppNavigator detects user != null and renders MainAppNavigator.
      // No navigation.navigate() needed here.

    } catch (error) {
      Alert.alert("Registration Failed", error.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── FIELD RENDERER HELPER ───────────────────────────────────────────────
  // A plain function (not a component) that returns one field's JSX.
  // The 'visible' prop lets hospital-only fields show/hide cleanly.
  const renderField = ({
    label,
    iconName,
    value,
    onChangeText,
    errorKey,
    placeholder,
    secureTextEntry = false,
    showToggle = false,
    showState,
    toggleFn,
    keyboardType = "default",
    autoCapitalize = "words",
    visible = true,
  }) => {
    if (!visible) return null;

    const hasError = !!errors[errorKey];

    return (
      <View style={styles.fieldGroup} key={label}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputBox, hasError && styles.inputBoxError]}>
          <MaterialIcons
            name={iconName}
            size={20}
            color={hasError ? "#EF4444" : "#94A3B8"}
          />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={(text) => {
              onChangeText(text);
              clearError(errorKey);
            }}
            secureTextEntry={showToggle ? !showState : secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
          />
          {showToggle && (
            <TouchableOpacity
              onPress={toggleFn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather
                name={showState ? "eye-off" : "eye"}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError && <Text style={styles.errorText}>{errors[errorKey]}</Text>}
      </View>
    );
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <MaterialCommunityIcons name="microscope" size={28} color="#0EA5E9" />
              <Text style={styles.logoText}>AidePoint</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {isHospital
                ? "Enter your professional details to register."
                : "Create your individual AidePoint account."}
            </Text>
          </View>

          {renderField({
            label: "Full Name",
            iconName: "person",
            value: fullName,
            onChangeText: setFullName,
            errorKey: "fullName",
            placeholder: "e.g. Kwame Mensah",
          })}

          {renderField({
            label: "Professional ID",
            iconName: "badge",
            value: professionalId,
            onChangeText: setProfessionalId,
            errorKey: "professionalId",
            placeholder: "e.g. GHS-2024-001",
            autoCapitalize: "characters",
            visible: isHospital,
          })}

          {renderField({
            label: "Institution / Hospital",
            iconName: "business",
            value: institution,
            onChangeText: setInstitution,
            errorKey: "institution",
            placeholder: "e.g. Korle Bu Teaching Hospital",
            visible: isHospital,
          })}

          {renderField({
            label: isHospital ? "Hospital Email" : "Email Address",
            iconName: "email",
            value: email,
            onChangeText: setEmail,
            errorKey: "email",
            placeholder: isHospital ? "name@hospital.org" : "your@email.com",
            keyboardType: "email-address",
            autoCapitalize: "none",
          })}

          {renderField({
            label: "Password",
            iconName: "lock",
            value: password,
            onChangeText: setPassword,
            errorKey: "password",
            placeholder: "Minimum 8 characters",
            showToggle: true,
            showState: showPassword,
            toggleFn: () => setShowPassword(!showPassword),
            autoCapitalize: "none",
          })}

          {renderField({
            label: "Confirm Password",
            iconName: "lock",
            value: confirmPassword,
            onChangeText: setConfirmPassword,
            errorKey: "confirmPassword",
            placeholder: "Re-enter your password",
            showToggle: true,
            showState: showConfirm,
            toggleFn: () => setShowConfirm(!showConfirm),
            autoCapitalize: "none",
          })}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Register Account</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("SignIn")}
            style={styles.signInLink}
          >
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.linkText}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: "#FFFFFF" },
  flex:          { flex: 1 },
  container:     { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header:        { paddingTop: 36, paddingBottom: 24 },
  logoRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  logoText:      { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  title:         { fontSize: 26, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  subtitle:      { fontSize: 14, color: "#64748B", lineHeight: 21 },
  fieldGroup:    { marginBottom: 16 },
  label:         { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    backgroundColor: "#F8FAFC",
    gap: 10,
  },
  inputBoxError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  input:         { flex: 1, fontSize: 15, color: "#0F172A" },
  errorText:     { fontSize: 12, color: "#EF4444", marginTop: 4, marginLeft: 2 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled:   { opacity: 0.65 },
  buttonText:    { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  signInLink:    { alignItems: "center" },
  footerText:    { fontSize: 14, color: "#64748B" },
  linkText:      { color: "#0EA5E9", fontWeight: "600" },
});

export default SignUp;