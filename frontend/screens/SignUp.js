// screens/SignUp.js
import React, { useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { signupStyle as styles } from "../styles/SignUpStyles";

const SignUp = () => {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  // Dummy user created only when Register is pressed
  const handleRegister = () => {
    const dummyUser = { name: "Dr. Joshua", email: "joshua@hospital.org" };
    login(dummyUser);                // Save to AsyncStorage
    navigation.replace("MainAppNavigator");   // Go to MainApp navigator
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="microscope" size={20} color="#00CFE8" />
          </View>
          <Text style={styles.logoText}>AidePoint</Text>
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Enter your professional details to get started.</Text>

        {/* Form Fields */}
        {[
          { label: "Full Name", icon: <MaterialIcons name="person" size={20} color="#888" /> },
          { label: "Professional ID", icon: <MaterialIcons name="badge" size={20} color="#888" /> },
          { label: "Institution", icon: <MaterialIcons name="business" size={20} color="#888" /> },
          { label: "Hospital Email", icon: <MaterialIcons name="email" size={20} color="#888" /> },
          { label: "Password", icon: <MaterialIcons name="lock" size={20} color="#888" /> },
        ].map((field) => (
          <View key={field.label} style={styles.inputGroup}>
            <Text style={styles.label}>{field.label}</Text>
            <View style={styles.inputBox}>
              {field.icon}
              <TextInput
                style={styles.input}
                placeholder={`e.g. ${field.label}`}
                secureTextEntry={field.label === "Password"}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register Account →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace("SignIn")}>
          <Text style={styles.footerLink}>
            Already have an account? <Text style={styles.linkText}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignUp;