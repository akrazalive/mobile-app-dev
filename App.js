import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './lib/supabase';
import RoleSelectionScreen from './Screens/RoleSelectionScreen';
import LoginScreen from './Screens/LoginScreen';
import PrincipalDashboard from './Screens/PrincipalDashboard';
import DashboardScreen from './Screens/DashboardScreen';

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        getUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await getUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.log('Error fetching role:', error);
        // Fallback: determine role from email
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email?.includes('principal')) setUserRole('principal');
        else if (user?.email?.includes('teacher')) setUserRole('teacher');
        else if (user?.email?.includes('farm')) setUserRole('farm_master');
        else setUserRole('student');
      } else if (data) {
        setUserRole(data.role);
      }
      setLoading(false);
    } catch (err) {
      console.log('Error:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Or a splash screen
  }

  // Determine which dashboard to show based on role
  const getDashboardScreen = () => {
    if (userRole === 'principal') return PrincipalDashboard;
    return DashboardScreen;
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Not logged in - show role selection and login
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          // Logged in - show appropriate dashboard
          <Stack.Screen name="Dashboard" component={getDashboardScreen()} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}