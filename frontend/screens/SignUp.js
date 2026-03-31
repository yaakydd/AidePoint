import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIeecons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialIcons";
import { signupStyles } from "../styles/SignUpStyles";

const SignUp = () => {
  const [form, setForm] = useState({
    name: "",
    id: "",
    institution: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    let newErrors = {};

    if (!form.name) newErrors.name = "Full name is required";
    if (!form.id) newErrors.id = "Professional ID is required";
    if (!form.institution) newErrors.institution = "Institution is required";
    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!form.email.includes("@")) {
      newErrors.email = "Invalid email";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    return newErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors({});
      console.log("Form submitted:", form);
      // TODO: Connect to API
    }
  };

  return (
    <SafeAreaView style={signupStyles.container}>
      <ScrollView contentContainerStyle={signupStyles.scrollContent}>
        <View style={signupStyles.card}>
          {/* Logo/Header */}
          <View style={signupStyles.logoRow}>
            <View style={signupStyles.logoCircle}>
              <MaterialCommunityIcons name="microscope" size={20} color="#00CFE8" />
            </View>
            <Text style={signupStyles.logoText}>AidePoint</Text>
          </View>

          {/* Title */}
          <Text style={signupStyles.title}>Create Technician Account</Text>
          <Text style={signupStyles.subtitle}>
            Enter your professional details to get started.
          </Text>

          {/* Full Name */}
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
          {errors.name && <Text style={signupStyles.error}>{errors.name}</Text>}

          {/* Professional ID */}
          <Text style={signupStyles.label}>Professional ID</Text>
          <View style={signupStyles.inputWrapper}>
            <Icon name="badge" size={20} color="#888" />
            <TextInput
              placeholder="Professional ID"
              style={signupStyles.input}
              value={form.id}
              onChangeText={(text) => setForm({ ...form, id: text })}
            />
          </View>
          {errors.id && <Text style={signupStyles.error}>{errors.id}</Text>}

          {/* Institution */}
          <Text style={signupStyles.label}>Institution</Text>
          <View style={signupStyles.inputWrapper}>
            <Icon name="business" size={20} color="#888" />
            <TextInput
              placeholder="Institution"
              style={signupStyles.input}
              value={form.institution}
              onChangeText={(text) => setForm({ ...form, institution: text })}
            />
          </View>
          {errors.institution && <Text style={signupStyles.error}>{errors.institution}</Text>}

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
          {errors.email && <Text style={signupStyles.error}>{errors.email}</Text>}

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
          {errors.password && <Text style={signupStyles.error}>{errors.password}</Text>}

          {/* Register Button */}
          <TouchableOpacity style={signupStyles.registerBtn} onPress={handleSubmit}>
            <Text style={signupStyles.registerBtnText}>Register Account</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Footer / Legal */}
        <Text style={signupStyles.footerLegal}>
          © 2024 AidePoint Diagnostic Systems. All medical data is encrypted and HIPAA compliant.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;