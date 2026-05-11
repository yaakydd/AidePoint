import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";

const SignIn = () => {
  // Controlled input state, every character the user types in the input textboxes is
  // tracked here so we can read it, validate it and send it.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // isSubmitting prevents double-taps and shows a spinner on the button
  const [isSubmitting, setIsSubmitting] = useState(false);

  // errors is an object where each key matches a field name.
  // Example: { email: "Please enter a valid email" }
  const [errors, setErrors] = useState({});

  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  // useRoute enables us to read params passed from other screens.
  // UserTypeScreen passes { userType: 'hospital' | 'personal' }
  // so we can customise the placeholder text accordingly.
  const route = useRoute();
  const userType = route.params?.userType ?? "hospital";

  // VALIDATION 
  // Returns true if all fields pass, false if anything fails.
  // Also the 'errors' state is populated so the UI can show messages.
  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      // Basic email regex: something@something.something
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    // No keys = no errors = valid
    return Object.keys(newErrors).length === 0;
  };

  // SIGN IN HANDLER 
  const handleSignIn = async () => {
    if (!validate()) return; // stops here if any field fails

    setIsSubmitting(true);
    try {
      //  TODO: Replace block below with real API call 
      // Example with your future backend:
      //
      //   const response = await fetch('https://your-api.com/auth/login', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ email, password, userType }),
      //   });
      //   const data = await response.json();
      //   if (!response.ok) throw new Error(data.message);
      //   await login(data.user);
      //
      //  Mock: simulates a 1-second network delay 
      await new Promise((res) => setTimeout(res, 1000));

      // This is what your backend will eventually return in data.user
      const mockUser = {
        id: "usr_001",
        name: "Lab Technician",
        email: email.trim().toLowerCase(),
        role: "lab_technician",   // lab_technician | doctor | admin
        userType,                  // hospital | solo
        hospitalId: userType === "hospital" ? "hosp_001" : null,
      };

      await login(mockUser);
      // AppNavigator detects that 'user' is now non-null
      // and automatically switches to MainAppNavigator.
      // No manual navigation.navigate() needed here.

    } catch (error) {
      Alert.alert(
        "Sign In Failed",
        error.message ?? "Something went wrong. Please try again."
      );
    } finally {
      // Always re-enable the button, success or failure
      setIsSubmitting(false);
    }
  };

  // RENDER 
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/*
        KeyboardAvoidingView pushes the form UP when the keyboard opens,
        so the active TextInput is never hidden behind it.

        iOS uses "padding" so it adds padding to the bottom.
        Android uses "height" so it shrinks the view height.
        These behave differently per OS, which is why we check Platform.OS.
      */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/*
          keyboardShouldPersistTaps="handled" means tapping the Sign In button
          while the keyboard is open won't dismiss the keyboard first so it will
          immediately fire the button's onPress. Without this, users have to
          tap twice: once to dismiss keyboard, once to submit.
        */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <MaterialCommunityIcons name="microscope" size={28} color="#0EA5E9" />
              <Text style={styles.brandTitle}>AidePoint</Text>
            </View>
            <Text style={styles.mainTitle}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your work</Text>
          </View>

          {/* Form  */}
          <View style={styles.form}>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>
                {userType === "hospital" ? "Hospital Email" : "Email Address"}
              </Text>
              <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                <Feather
                  name="mail"
                  size={20}
                  color={errors.email ? "#EF4444" : "#94A3B8"}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    userType === "hospital" ? "name@hospital.org" : "your@email.com"
                  }
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    // Clear the error the moment the user starts correcting it
                    if (errors.email) setErrors((p) => ({ ...p, email: null }));
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"   // Shows "Next" on Android keyboard
                />
              </View>
              {/* Inline error message under the field */}
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputBox, errors.password && styles.inputBoxError]}>
                <Feather
                  name="lock"
                  size={20}
                  color={errors.password ? "#EF4444" : "#94A3B8"}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((p) => ({ ...p, password: null }));
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn} // pressing "Done" on keyboard submits
                />
                {/* Eye toggle: hitSlop makes the tap area larger than the icon itself */}
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() =>
                Alert.alert(
                  "Reset Password",
                  "Password reset will be available once the backend is connected."
                )
              }
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* SIGN IN BUTTON */}
            <TouchableOpacity
              style={[styles.signInBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={isSubmitting}   // prevents double-tap
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.signInBtnText}>Sign In</Text>
                  <Feather name="arrow-right" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            {/* SIGN UP LINK */}
            <TouchableOpacity
              onPress={() => navigation.navigate("SignUp")}
              style={styles.signUpLink}
            >
              <Text style={styles.baseText}>
                Don't have an account?{" "}
                <Text style={styles.signUpLinkText}>Sign Up</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};