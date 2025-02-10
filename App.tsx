import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import Home from './app/screens/Home';
import Login from './app/screens/Login';
import Register from './app/screens/Register';
import Accueil from './app/screens/Accueil';
import Portefeuille from './app/screens/Portefeuille';
import Transactions from './app/screens/Transactions';
import Parametres from './app/screens/Parametres';
import Admin from './app/screens/Admin';
import Layout from './app/components/Layout';

const Stack = createNativeStackNavigator();

// Wrapper pour les écrans authentifiés
const withLayout = (Component) => (props) => (
  <Layout>
    <Component {...props} />
  </Layout>
);

const Navigation = () => {
  const { user } = useAuth();

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={true}
      />
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' }
        }}
      >
        {!user ? (
          // Routes non authentifiées
          <>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
          </>
        ) : user.role === 'admin' ? (
          // Routes admin
          <>
            <Stack.Screen name="Admin" component={Admin} />
          </>
        ) : (
          // Routes utilisateur normal
          <>
            <Stack.Screen name="Accueil" component={withLayout(Accueil)} />
            <Stack.Screen name="Portefeuille" component={withLayout(Portefeuille)} />
            <Stack.Screen name="Transactions" component={withLayout(Transactions)} />
            <Stack.Screen name="Parametres" component={withLayout(Parametres)} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Navigation />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
