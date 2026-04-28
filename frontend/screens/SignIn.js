import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { signInStyles as styles } from "../styles/SignInStyles";

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  // Simple login (no database yet)
  const handleSignIn = () => {
    const userData = {
      email,
      name: "Lab Technician", // temporary placeholder
    };

    login(userData); // saves user + triggers navigation flow
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>AidePoint</Text>
        <Text style={styles.brandSubtitle}>
          Trusted Lab Diagnostic Tool
        </Text>
        <Text style={styles.mainTitle}>Sign In</Text>
      </View>

      <View style={styles.form}>
        {/* EMAIL */}
        <Text style={styles.inputLabel}>Hospital Email</Text>
        <View style={styles.inputBox}>
          <Feather name="mail" size={20} color="#94A3B8" />
          <TextInput
            style={styles.textInput}
            placeholder="name@hospital.org"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* PASSWORD */}
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

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>

        </View>

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
        

        {/* SIGN IN BUTTON */}
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={handleSignIn}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
          <Feather name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* SIGN UP NAVIGATION */}
        <TouchableOpacity
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.BaseText}>
            Don't have an account?
            <Text style={styles.SignUpLinkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignIn;