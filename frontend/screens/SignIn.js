// screens/SignInScreen.js
import React, { useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { signInStyles as styles } from "../styles/SignInStyles";

const SignIn = () => {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  const dummyUser = { name: "Dr. Joshua", email: "joshua@hospital.org" };

  const handleSignIn = () => {
    login(dummyUser);
    navigation.replace("MainAppNavigator"); // navigate to bottom tabs
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        </View>

        <TouchableOpacity style={styles.signUpLink} onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.footerBaseText}>
            Don't have an account? <Text style={styles.footerLinkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;