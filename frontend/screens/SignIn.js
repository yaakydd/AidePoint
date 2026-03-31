import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { signInStyles as styles } from "../styles/SignInStyles";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const SignIn = () => {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    // ✅ Fill your dummy user data here
    const dummyUser = {
      name: "Joshua",
      email: email || "joshua@hospital.org",
      role: "Technician",
    };

    login(dummyUser); // This will set the user in AuthContext and navigate to MainApp
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>AidePoint</Text>
          <Text style={styles.brandSubtitle}>Trusted Diagnostic Tool</Text>
          <Text style={styles.mainTitle}>Sign In</Text>
        </View>

        {/* Email */}
        <Text style={styles.inputLabel}>Hospital Email</Text>
        <View style={styles.inputBox}>
          <Feather name="mail" size={20} color="#94A3B8" />
          <TextInput
            style={styles.textInput}
            placeholder="name@hospital.org"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>

        {/* Password */}
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputBox}>
          <Feather name="lock" size={20} color="#94A3B8" />
          <TextInput
            style={styles.textInput}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity style={styles.signInBtn} onPress={handleLogin}>
          <Text style={styles.signInBtnText}>Sign In</Text>
          <Feather name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Navigate to SignUp */}
        <TouchableOpacity
          style={styles.signUpLink}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.footerBaseText}>
            Don't have an account?{" "}
            <Text style={styles.footerLinkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;