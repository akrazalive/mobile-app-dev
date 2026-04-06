import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function DashboardScreen() {
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    getUserProfile();
  }, []);

  const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email);
      
      // Try to get role from users table
      const { data } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserName(data.name);
        setUserRole(data.role);
      } else {
        // Fallback: determine role from email
        if (user.email.includes('principal')) setUserRole('principal');
        else if (user.email.includes('teacher')) setUserRole('teacher');
        else if (user.email.includes('farm')) setUserRole('farm_master');
        else setUserRole('student');
        setUserName(user.email.split('@')[0]);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getDashboardContent = () => {
    switch (userRole) {
      case 'principal':
        return (
          <View style={styles.roleContent}>
            <Text style={styles.roleTitle}>Principal Dashboard</Text>
            <Text>• View all teachers and students</Text>
            <Text>• Generate reports</Text>
            <Text>• Manage classes</Text>
          </View>
        );
      case 'teacher':
        return (
          <View style={styles.roleContent}>
            <Text style={styles.roleTitle}>Teacher Dashboard</Text>
            <Text>• Your classes</Text>
            <Text>• Student attendance</Text>
            <Text>• Enter marks</Text>
          </View>
        );
      case 'farm_master':
        return (
          <View style={styles.roleContent}>
            <Text style={styles.roleTitle}>Farm Master Dashboard</Text>
            <Text>• Mark daily attendance</Text>
            <Text>• View attendance reports</Text>
          </View>
        );
      default:
        return (
          <View style={styles.roleContent}>
            <Text style={styles.roleTitle}>Student Dashboard</Text>
            <Text>• View your attendance</Text>
            <Text>• Check your marks</Text>
            <Text>• View timetable</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {userName || 'User'}!</Text>
        <Text style={styles.email}>{userEmail}</Text>
        <Text style={styles.role}>Role: {userRole || 'Loading...'}</Text>
      </View>

      {getDashboardContent()}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24, 
    backgroundColor: '#f5f5f5' 
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  welcome: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff',
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  role: { 
    fontSize: 16, 
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  logoutButton: { 
    backgroundColor: '#e74c3c', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  logoutText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
  },
});