import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { signupStyles } from "../styles/SignUpStyles";
import { AuthContext } from "../context/AuthContext";

const SignUp = () => {
  const { login } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = () => {
    // ✅ Fill your dummy user data here
    const dummyUser = {
      name: form.name || "New User",
      email: form.email || "user@hospital.org",
      role: "Technician",
    };

    login(dummyUser); // Sets user and navigates to MainApp
  };

  return (
    <SafeAreaView style={signupStyles.container}>
      <ScrollView contentContainerStyle={signupStyles.scrollContent}>
        <View style={signupStyles.card}>
          {/* Header */}
          <View style={signupStyles.logoRow}>
            <View style={signupStyles.logoCircle}>
              <MaterialCommunityIcons
                name="microscope"
                size={20}
                color="#00CFE8"
              />
            </View>
            <Text style={signupStyles.logoText}>AidePoint</Text>
          </View>

          <Text style={signupStyles.title}>Create Technician Account</Text>

          {/* Name */}
          <Text style={signupStyles.label}>Full Name</Text>
          <View style={signupStyles.inputWrapper}>
            <Icon name="person" size={20} color="#888" />
            <TextInput
              placeholder="Full Name"
              style={signupStyles.input}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
            />
          </View>

          {/* Email */}
          <Text style={signupStyles.label}>Email</Text>
          <View style={signupStyles.inputWrapper}>
            <Icon name="email" size={20} color="#888" />
            <TextInput
              placeholder="Email"
              style={signupStyles.input}
              keyboardType="email-address"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
            />
          </View>

          {/* Password */}
          <Text style={signupStyles.label}>Password</Text>
          <View style={signupStyles.inputWrapper}>
            <Icon name="lock" size={20} color="#888" />
            <TextInput
              placeholder="Password"
              style={signupStyles.input}
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={signupStyles.registerBtn}
            onPress={handleRegister}
          >
            <Text style={signupStyles.registerBtnText}>Register Account</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;