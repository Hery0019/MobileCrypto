import React, { useState } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { authErrorMessage } from '../utils/authErrors';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(FIREBASE_AUTH, email.trim(), password);

      if (!credential.user.emailVerified) {
        // AuthProvider ignore les comptes non vérifiés : on reste sur cet écran.
        // La session Firebase est conservée le temps du choix pour pouvoir
        // renvoyer le lien, puis fermée dans tous les cas.
        const closeSession = () => signOut(FIREBASE_AUTH).catch(() => undefined);
        Alert.alert(
          'Adresse e-mail non vérifiée',
          'Confirmez votre adresse en cliquant sur le lien reçu par e-mail, puis reconnectez-vous.',
          [
            {
              text: "Renvoyer l'e-mail",
              onPress: async () => {
                try {
                  await sendEmailVerification(credential.user);
                  Alert.alert('E-mail envoyé', 'Vérifiez votre boîte de réception (et les spams).');
                } catch (sendError) {
                  console.error("Renvoi de l'e-mail de vérification impossible:", sendError);
                  Alert.alert('Erreur', "Impossible d'envoyer l'e-mail pour le moment. Réessayez plus tard.");
                } finally {
                  await closeSession();
                }
              },
            },
            { text: 'OK', onPress: closeSession },
          ],
          { cancelable: false }
        );
        setLoading(false);
        return;
      }
      // Le profil est chargé par AuthProvider (onAuthStateChanged) et la
      // navigation bascule automatiquement ; cet écran est alors démonté.
    } catch (error) {
      console.error('Erreur de connexion:', error);
      Alert.alert('Erreur de connexion', authErrorMessage(error, 'Connexion impossible. Réessayez.'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/icon2.png')} style={styles.logo} />
          <Text style={styles.title}>MobileCrypto</Text>
        </View>


        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={24} 
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />
          ) : (
            <TouchableOpacity style={styles.button} onPress={signIn}>
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  formContainer: {
    width: '90%',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordInput: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
  },
  eyeIcon: {
    width: '20%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
});

export default Login;
