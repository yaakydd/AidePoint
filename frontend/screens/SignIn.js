// screens/SignIn.js
import React, { useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { signInStyles as styles } from "../styles/SignInStyles";

const SignIn = () => {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  // Only login when button is pressed
  const handleSignIn = () => {
    const dummyUser = { name: "Dr. Joshua", email: "joshua@hospital.org" };
    login(dummyUser);                // Save to AsyncStorage
    navigation.replace("MainAppNavigator");   // Navigate to MainAppNavigator
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>AidePoint</Text>
        <Text style={styles.brandSubtitle}>Trusted Diagnostic tool</Text>
        <Text style={styles.mainTitle}>Sign In</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.inputLabel}>Hospital Email</Text>
        <View style={styles.inputBox}>
          <Feather name="mail" size={20} color="#94A3B8" />
          <TextInput style={styles.textInput} placeholder="name@hospital.org" placeholderTextColor="#94A3B8" />
        </View>

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputBox}>
          <Feather name="lock" size={20} color="#94A3B8" />
          <TextInput style={styles.textInput} placeholder="••••••••" placeholderTextColor="#94A3B8" secureTextEntry />
          <Feather name="eye" size={20} color="#94A3B8" />
        </View>

        <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
          <Text style={styles.signInBtnText}>Sign In</Text>
          <Feather name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace("SignUp")}>
          <Text style={styles.footerBaseText}>
            Don't have an account? <Text style={styles.footerLinkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignIn;