import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

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
      await signInWithEmailAndPassword(FIREBASE_AUTH, email.trim(), password);
      // Le profil est chargé par AuthProvider (onAuthStateChanged) et la
      // navigation bascule automatiquement ; cet écran est alors démonté.
    } catch (error) {
      console.error('Erreur de connexion:', error);
      Alert.alert(
        'Erreur de connexion',
        'Veuillez vérifier votre email et mot de passe'
      );
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
