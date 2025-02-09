import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Login = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const signIn = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;
      await user.reload();

      if (user.emailVerified) {
        const userRef = doc(FIREBASE_DB, 'utilisateurs', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        
        setUser({
          uid: user.uid,
          email: user.email!,
          displayName: userData?.nom || user.email,
          photoURL: userData?.photoURL || null
        });
        
        Alert.alert('Connexion réussie');
        navigation.navigate('Accueil');
      } else {
        Alert.alert('Erreur', 'Veuillez vérifier votre adresse e-mail avant de vous connecter.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Échec de la connexion');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        {loading ? <ActivityIndicator size="large" color="#0000ff" /> : <Button title="Se connecter" onPress={signIn} />}
      </View>
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
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 10,
  },
});

export default Login;
