import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import styles from "../styles/SignUp";

const SignUp = (navigation) => {
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

    if (!form.institution)
      newErrors.institution = "Institution is required";

    if (!form.email) newErrors.email = "Email is required";
    else if (!form.email.includes("@"))
      newErrors.email = "Invalid email";

    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    return newErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors({});
      console.log("Form submitted:", form);

      // TODO: Connect to FastAPI
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        
        <Text style={styles.title}>Create Technician Account</Text>
        <Text style={styles.subtitle}>
          Enter your professional details to get started.
        </Text>

        {/* Full Name */}
        <View style={styles.inputWrapper}>
          <Icon name="person" size={20} color="#888" />
          <TextInput
            placeholder="Full Name"
            style={styles.input}
            value={form.name}
            onChangeText={(text) =>
              setForm({ ...form, name: text })
            }
          />
        </View>
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}

        {/* ID */}
        <View style={styles.inputWrapper}>
          <Icon name="badge" size={20} color="#888" />
          <TextInput
            placeholder="Professional ID"
            style={styles.input}
            value={form.id}
            onChangeText={(text) =>
              setForm({ ...form, id: text })
            }
          />
        </View>
        {errors.id && <Text style={styles.error}>{errors.id}</Text>}

        {/* Institution */}
        <View style={styles.inputWrapper}>
          <Icon name="business" size={20} color="#888" />
          <TextInput
            placeholder="Institution"
            style={styles.input}
            value={form.institution}
            onChangeText={(text) =>
              setForm({ ...form, institution: text })
            }
          />
        </View>
        {errors.institution && (
          <Text style={styles.error}>{errors.institution}</Text>
        )}

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Icon name="email" size={20} color="#888" />
          <TextInput
            placeholder="Email"
            style={styles.input}
            keyboardType="email-address"
            value={form.email}
            onChangeText={(text) =>
              setForm({ ...form, email: text })
            }
          />
        </View>
        {errors.email && <Text style={styles.error}>{errors.email}</Text>}

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Icon name="lock" size={20} color="#888" />
          <TextInput
            placeholder="Password"
            style={styles.input}
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(text) =>
              setForm({ ...form, password: text })
            }
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
          >
            <Icon
              name={showPassword ? "visibility" : "visibility-off"}
              size={20}
              color="#888"
            />
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.error}>{errors.password}</Text>
        )}

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>
            Register Technician Account
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default SignUp;