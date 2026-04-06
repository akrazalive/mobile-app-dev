import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function RoleSelectionScreen({ navigation }) {
  const roles = [
    { id: 'student', label: 'Student', color: '#3498db', icon: '🎓' },
    { id: 'teacher', label: 'Teacher', color: '#2ecc71', icon: '👨‍🏫' },
    { id: 'farm_master', label: 'Farm Master', color: '#f39c12', icon: '🌾' },
    { id: 'principal', label: 'Super Admin / Principal', color: '#e74c3c', icon: '👑' },
  ];

  const handleRolePress = (role) => {
    navigation.navigate('Login', { selectedRole: role.id });
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <View style={styles.backgroundTop} />
      <View style={styles.backgroundBottom} />

      {/* School Image */}
      <View style={styles.imageContainer}>
        <View style={styles.imageCircle}>
          <Text style={styles.imageEmoji}>🏫</Text>
        </View>
        <Text style={styles.schoolName}>Elite Academy</Text>
        <Text style={styles.schoolTagline}>Empowering Minds, Building Futures</Text>
      </View>

      {/* Welcome Text */}
      <Text style={styles.welcomeTitle}>Welcome Back!</Text>
      <Text style={styles.welcomeSubtitle}>Please select your role to continue</Text>

      {/* Role Buttons */}
      <View style={styles.buttonsContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[styles.roleButton, { backgroundColor: role.color }]}
            onPress={() => handleRolePress(role)}
            activeOpacity={0.8}
          >
            <Text style={styles.roleIcon}>{role.icon}</Text>
            <View style={styles.roleTextContainer}>
              <Text style={styles.roleLabel}>{role.label}</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>Powered by School Management System</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backgroundTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    backgroundColor: '#2c3e50',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backgroundBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.15,
    backgroundColor: '#ecf0f1',
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 30,
  },
  imageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  imageEmoji: {
    fontSize: 60,
  },
  schoolName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
  },
  schoolTagline: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 20,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 40,
    marginBottom: 20,
  },
});