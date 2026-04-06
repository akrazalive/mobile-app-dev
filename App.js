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
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    if (session) {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setUserRole(data?.role);
    }
    setLoading(false);
  };

  if (loading) return null;

  const getDashboardScreen = () => {
    if (userRole === 'principal') return PrincipalDashboard;
    return DashboardScreen;
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          <Stack.Screen name="Dashboard" component={getDashboardScreen()} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}