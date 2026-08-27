// Register.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { authErrorMessage } from '../utils/authErrors';

const Register = ({ navigation }: { navigation: any }) => {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    const values = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim(),
      contact: contact.trim(),
    };
    if (!values.prenom || !values.nom || !values.email || !values.contact || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    let createdUser: FirebaseUser | null = null;
    try {
      const credential = await createUserWithEmailAndPassword(FIREBASE_AUTH, values.email, password);
      createdUser = credential.user;

      // 1. Le profil Firestore d'abord : sans lui, le compte est inutilisable.
      //    Le document est identifié par l'uid Auth, seule identité de référence.
      await setDoc(doc(FIREBASE_DB, 'utilisateurs', createdUser.uid), {
        ...values,
        photoURL: null,
        role: 'user',
        porteFeuille: 0,
        date_creation: serverTimestamp(),
      });

      // 2. Lien de vérification. Un échec ici n'invalide pas l'inscription :
      //    Login propose de le renvoyer.
      try {
        await sendEmailVerification(createdUser);
      } catch (mailError) {
        console.warn("Envoi de l'e-mail de vérification différé:", mailError);
      }

      // 3. La session ouverte par createUser est fermée : l'utilisateur se
      //    connecte une fois son adresse confirmée.
      await signOut(FIREBASE_AUTH);
      Alert.alert('Inscription réussie', 'Un e-mail de confirmation a été envoyé. Cliquez sur le lien reçu, puis connectez-vous.');
      navigation.navigate('Login');
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      // Rollback : un compte Auth sans profil bloquerait l'adresse à vie
      // ('email-already-in-use' à chaque nouvel essai).
      if (createdUser) {
        try {
          await createdUser.delete();
        } catch (rollbackError) {
          console.error('Rollback du compte Auth impossible:', rollbackError);
        }
      }
      Alert.alert('Erreur', authErrorMessage(error, "Une erreur s'est produite lors de l'inscription. Veuillez réessayer."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>S'inscrire</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Prénom" 
        value={prenom} 
        onChangeText={setPrenom}
      />
      <TextInput 
        style={styles.input} 
        placeholder="Nom" 
        value={nom} 
        onChangeText={setNom}
      />
      <TextInput 
        style={styles.input} 
        placeholder="Contact" 
        value={contact} 
        onChangeText={setContact}
      />
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
        <Button title="S'inscrire" onPress={signUp} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 10
  },
});

export default Register;
