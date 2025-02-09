// Register.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, orderBy, limit, addDoc } from 'firebase/firestore';

const Register = ({ navigation }: { navigation: any }) => {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getNextId = async () => {
    try {
      const usersRef = collection(FIREBASE_DB, 'utilisateurs');
      const q = query(usersRef, orderBy('id', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return 1; // Premier utilisateur
      }
      
      const lastUser = querySnapshot.docs[0].data();
      return (lastUser.id || 0) + 1;
    } catch (error) {
      console.error("Erreur lors de la récupération du dernier ID:", error);
      return 1;
    }
  };

  const initializeCryptoWallets = async (userId: number) => {
    try {
      // Récupérer toutes les cryptomonnaies
      const cryptosSnapshot = await getDocs(collection(FIREBASE_DB, 'cryptocurrencies'));
      const cryptowalletRef = collection(FIREBASE_DB, 'cryptowallet');
      const userRef = doc(FIREBASE_DB, 'utilisateurs', email);

      // Pour chaque crypto, créer un wallet avec valeur 0
      const promises = cryptosSnapshot.docs.map(async (cryptoDoc) => {
        const cryptoRef = doc(FIREBASE_DB, 'cryptocurrencies', cryptoDoc.id);
        return addDoc(cryptowalletRef, {
          user: userRef,
          crypto: cryptoRef,
          valeur: 0
        });
      });

      await Promise.all(promises);
      console.log("Wallets initialisés pour l'utilisateur:", userId);
    } catch (error) {
      console.error("Erreur lors de l'initialisation des wallets:", error);
      throw error;
    }
  };

  const signUp = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = userCredential.user;
      await sendEmailVerification(user);

      const nextId = await getNextId();
      
      // Créer le document utilisateur avec l'email comme ID du document
      const userRef = doc(FIREBASE_DB, 'utilisateurs', email);
      await setDoc(userRef, {
        id: nextId,
        nom,
        prenom,
        contact,
        email,
        photo: '',
        password,
        role: '/roles/utilisateur',
        porteFeuille: 0,
      });

      // Initialiser les wallets pour toutes les cryptos
      await initializeCryptoWallets(nextId);
      
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
