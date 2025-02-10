import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { CommonActions, useNavigation } from '@react-navigation/native';

const Parametres = () => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  const handleLogout = async () => {
    try {
      await FIREBASE_AUTH.signOut();
      setUser(null);
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Home'
        })
      );
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = FIREBASE_AUTH.currentUser;
              if (user) {
                await user.delete();
                Alert.alert('Succès', 'Votre compte a été supprimé avec succès');
              }
            } catch (error) {
              console.error('Erreur lors de la suppression du compte:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le compte');
            }
          },
        },
      ]
    );
  };

  const handlePasswordChange = () => {
    if (user?.email) {
      FIREBASE_AUTH.sendPasswordResetEmail(user.email)
        .then(() => {
          Alert.alert(
            'Email envoyé',
            'Un email de réinitialisation du mot de passe a été envoyé à votre adresse email.'
          );
        })
        .catch((error) => {
          console.error('Erreur lors de l\'envoi de l\'email:', error);
          Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de réinitialisation');
        });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Paramètres</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.profileInfo}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handlePasswordChange}>
          <Ionicons name="key-outline" size={24} color="#2c3e50" />
          <Text style={styles.buttonText}>Changer le mot de passe</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.deleteButton]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          <Text style={[styles.buttonText, styles.deleteButtonText]}>
            Se déconnecter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.deleteButton]} 
          onPress={handleDeleteAccount}
        >
          <Ionicons name="trash-outline" size={24} color="#e74c3c" />
          <Text style={[styles.buttonText, styles.deleteButtonText]}>
            Supprimer le compte
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Préférences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Ionicons name="notifications-outline" size={24} color="#2c3e50" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#767577', true: '#2c3e50' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Ionicons name="moon-outline" size={24} color="#2c3e50" />
            <Text style={styles.settingText}>Mode sombre</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#767577', true: '#2c3e50' }}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Ionicons name="finger-print-outline" size={24} color="#2c3e50" />
            <Text style={styles.settingText}>Authentification biométrique</Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={setBiometrics}
            trackColor={{ false: '#767577', true: '#2c3e50' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  profileInfo: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#2c3e50',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#2c3e50',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
  },
  buttonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
  },
  deleteButtonText: {
    color: '#e74c3c',
  },
  version: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default Parametres;
