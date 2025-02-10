import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Login = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const signIn = async () => {
    setLoading(true);
    try {
      console.log('Tentative de connexion avec:', email); // Log l'email

      const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;
      console.log('Firebase Auth réussi, uid:', user.uid); // Log l'uid

      // D'abord, essayons de trouver l'utilisateur par email
      const usersRef = collection(FIREBASE_DB, 'utilisateurs');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Prendre le premier document correspondant
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        console.log('Données utilisateur trouvées:', userData); // Log les données utilisateur

        setUser({
          uid: user.uid,
          email: user.email!,
          role: userData.role || 'user',
          displayName: userData.nom || user.email,
          photoURL: userData.photoURL || null
        });

        Alert.alert('Connexion réussie');
        
        console.log('Role utilisateur:', userData.role); // Log le rôle

        if (userData.role === 'admin') {
          console.log('Redirection vers Admin'); // Log la redirection
          navigation.navigate('Admin');
        } else {
          console.log('Redirection vers Accueil'); // Log la redirection
          navigation.navigate('Accueil');
        }
      } else {
        console.log('Aucun utilisateur trouvé avec cet email'); // Log l'erreur
        Alert.alert('Erreur', 'Compte utilisateur non trouvé');
      }
    } catch (error) {
      console.error('Erreur complète:', error); // Log l'erreur complète
      Alert.alert('Échec de la connexion');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Informations de connexion :</Text>
          <Text style={styles.infoText}>Login admin : herakotonarivo@gmail.com</Text>
          <Text style={styles.infoText}>Mot de passe : 123456</Text>
          <Text style={styles.infoText}>Login user : ravelonarivoantonio@gmail.com</Text>
          <Text style={styles.infoText}>Mot de passe : 123456</Text>
        </View>

        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Mot de passe" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
          autoCapitalize="none" 
        />
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Button title="Se connecter" onPress={signIn} />
        )}
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
  infoContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
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
