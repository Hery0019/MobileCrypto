import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import Home from './app/screens/Home';
import Login from './app/screens/Login';
import Register from './app/screens/Register';
import Accueil from './app/screens/Accueil';
import Portefeuille from './app/screens/Portefeuille';
import Transactions from './app/screens/Transactions';
import Parametres from './app/screens/Parametres';
import Layout from './app/components/Layout';

const Stack = createNativeStackNavigator();

// Wrapper pour les écrans authentifiés
const AuthenticatedLayout = ({ children }) => (
  <Layout>{children}</Layout>
);

const Navigation = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Routes non authentifiées
        <>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
        </>
      ) : (
        // Routes authentifiées
        <>
          <Stack.Screen 
            name="Accueil"
            options={{ headerShown: false }}
          >
            {(props) => (
              <AuthenticatedLayout>
                <Accueil {...props} />
              </AuthenticatedLayout>
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Portefeuille"
            options={{ headerShown: false }}
          >
            {(props) => (
              <AuthenticatedLayout>
                <Portefeuille {...props} />
              </AuthenticatedLayout>
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Transactions"
            options={{ headerShown: false }}
          >
            {(props) => (
              <AuthenticatedLayout>
                <Transactions {...props} />
              </AuthenticatedLayout>
            )}
          </Stack.Screen>

          <Stack.Screen 
            name="Parametres"
            options={{ headerShown: false }}
          >
            {(props) => (
              <AuthenticatedLayout>
                <Parametres {...props} />
              </AuthenticatedLayout>
            )}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </AuthProvider>
  );
}
