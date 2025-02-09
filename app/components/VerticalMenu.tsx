import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

interface VerticalMenuProps {
  onCloseMenu?: () => void;
}

const VerticalMenu = ({ onCloseMenu }: VerticalMenuProps) => {
  const navigation = useNavigation();
  const { setUser } = useAuth();
  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 768;

  const menuItems = [
    { title: 'Accueil', screen: 'Accueil', icon: 'home' },
    { title: 'Portefeuille', screen: 'Portefeuille', icon: 'wallet' },
    { title: 'Transactions', screen: 'Transactions', icon: 'swap-horizontal' },
    { title: 'Paramètres', screen: 'Parametres', icon: 'settings' },
  ];

  const handleSignOut = async () => {
    try {
      await FIREBASE_AUTH.signOut();
      setUser(null);
      if (onCloseMenu) onCloseMenu();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const handleNavigation = (screen: string) => {
    navigation.navigate(screen);
    if (!isLargeScreen && onCloseMenu) {
      onCloseMenu();
    }
  };

  return (
    <View style={styles.container}>
      {!isLargeScreen && (
        <TouchableOpacity style={styles.closeButton} onPress={onCloseMenu}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.profileSection}>
        <Avatar />
        <Text style={styles.userName}>{FIREBASE_AUTH.currentUser?.email}</Text>
      </View>

      <View style={styles.menuItems}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleNavigation(item.screen)}
          >
            <Ionicons name={item.icon} size={24} color="#fff" style={styles.menuIcon} />
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out" size={24} color="#fff" style={styles.menuIcon} />
        <Text style={styles.signOutText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2c3e50',
    padding: 20,
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    zIndex: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  menuItems: {
    flex: 1,
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  menuIcon: {
    marginRight: 10,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e74c3c',
    borderRadius: 5,
    marginTop: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default VerticalMenu;
