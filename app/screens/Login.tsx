import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();

  const signIn = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;

      // Récupérer les données de l'utilisateur depuis Firestore
      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Si le document n'existe pas, créer un utilisateur par défaut
        const userInfo = {
          uid: user.uid,
          email: user.email,
          role: 'user', // Role par défaut
          displayName: user.email,
          photoURL: null
        };
        setUser(userInfo);
      } else {
        const userData = userDoc.data();
        const userInfo = {
          uid: user.uid,
          email: user.email,
          role: userData.role || 'user', // Utiliser 'user' comme rôle par défaut si non défini
          displayName: userData.nom || user.email,
          photoURL: userData.photo || null
        };
        setUser(userInfo);
      }
      // La navigation sera gérée automatiquement par le composant Navigation
    } catch (error) {
      console.error('Erreur de connexion:', error);
      Alert.alert(
        'Erreur de connexion',
        'Veuillez vérifier votre email et mot de passe'
      );
    }
    setLoading(false);
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

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Information de connexion :</Text>
          <View style={styles.infoSection}>
            <Text style={styles.infoSubtitle}>Admin :</Text>
            <Text style={styles.infoText}>Email : herakotonarivo@gmail.com</Text>
            <Text style={styles.infoText}>Mot de passe : 123456</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoSubtitle}>Utilisateur :</Text>
            <Text style={styles.infoText}>Email : ravelonarivoantonio@gmail.com</Text>
            <Text style={styles.infoText}>Mot de passe : 123456</Text>
          </View>
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
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '90%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoSection: {
    marginVertical: 8,
  },
  infoSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 10,
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
