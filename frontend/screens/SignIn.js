import React, { useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { signInStyles as styles } from '../styles/SignInStyles';

const SignIn = () => {
  const { login } = useContext(AuthContext);
  const navigation = useNavigation();

  // Dummy credentials
  const dummyUser = {
    name: 'Dr. Joshua',
    email: 'joshua@hospital.org',
  };

  const handleSignIn = () => {
    // Log in with dummy data
    login(dummyUser);
    // Navigate to HomeScreen / MainApp
    navigation.replace('HomeScreen'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>AidePoint</Text>
          <Text style={styles.brandSubtitle}>Trusted Diagnostic tool</Text>
          <Text style={styles.mainTitle}>Sign In</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Hospital Email</Text>
          <View style={styles.inputBox}>
            <Feather name="mail" size={20} color="#94A3B8" />
            <TextInput 
              style={styles.textInput} 
              placeholder="name@hospital.org" 
              placeholderTextColor="#94A3B8"
            />
          </View>

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputBox}>
            <Feather name="lock" size={20} color="#94A3B8" />
            <TextInput 
              style={styles.textInput} 
              placeholder="••••••••" 
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
            <Feather name="eye" size={20} color="#94A3B8" />
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
            <Text style={styles.signInBtnText}>Sign In</Text>
            <Feather name="arrow-right" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* SSO Section */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or sign in with SSO</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.ssoRow}>
          <TouchableOpacity style={styles.ssoButton}>
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
              style={styles.googleIcon} 
            />
            <Text style={styles.ssoBtnText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ssoButton}>
            <MaterialCommunityIcons name="hospital-box-outline" size={22} color="#475569" />
            <Text style={styles.ssoBtnText}>Hospital ID</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Navigation */}
        <TouchableOpacity style={styles.signUpLink} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.footerBaseText}>
            Don't have an account? <Text style={styles.footerLinkText}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        {/* Compliance Section */}
        <View style={styles.complianceBox}>
          <View style={styles.complianceRow}>
            <Feather name="shield" size={14} color="#94A3B8" />
            <Text style={styles.complianceTitle}>HIPAA COMPLIANT SECURE SERVER</Text>
          </View>
          <Text style={styles.complianceText}>
            This system is intended for authorized healthcare personnel only. Access is monitored and logged.
          </Text>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;