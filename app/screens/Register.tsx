// Register.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const Register = ({ navigation }: { navigation: any }) => {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);

      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.uid);
      await setDoc(userRef, {
        nom,
        prenom,
        contact,
        email,
        photo: '',
        password,
        role: doc(FIREBASE_DB, 'roles', 'utilisateur'),
        porteFeuille: null,
      });
      
      Alert.alert('Inscription réussie', 'Un e-mail de confirmation a été envoyé.');
      navigation.navigate('Login');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Échec de l\'inscription');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>S'inscrire</Text>
      <TextInput style={styles.input} placeholder="Prénom" value={prenom} onChangeText={setPrenom} />
      <TextInput style={styles.input} placeholder="Nom" value={nom} onChangeText={setNom} />
      <TextInput style={styles.input} placeholder="Contact" value={contact} onChangeText={setContact} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {loading ? <ActivityIndicator size="large" color="#0000ff" /> : <Button title="S'inscrire" onPress={signUp} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', height: 50, borderWidth: 1, borderRadius: 5, paddingLeft: 10, marginBottom: 10 },
});

export default Register;
