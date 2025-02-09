import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import Home from './app/screens/Home';
import Login from './app/screens/Login';
import Register from './app/screens/Register';
import Accueil from './app/screens/Accueil';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Home'>
        <Stack.Screen name='Home' component={Home} options={{ headerShown: false }} />
        <Stack.Screen name='Login' component={Login} options={{ title: 'Connexion' }} />
        <Stack.Screen name='Register' component={Register} options={{ title: 'inscription' }} />
        <Stack.Screen name='Accueil' component={Accueil} options={{ title: 'Accueil' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
