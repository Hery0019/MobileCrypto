import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import { RootStackParamList } from '../navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface VerticalMenuProps {
  onCloseMenu?: () => void;
}

const VerticalMenu = ({ onCloseMenu }: VerticalMenuProps) => {
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 768;

  const menuItems: { title: string; screen: keyof RootStackParamList; icon: IconName }[] = [
    { title: 'Accueil', screen: 'Accueil', icon: 'home' },
    { title: 'Portefeuille', screen: 'Portefeuille', icon: 'wallet' },
    { title: 'Transactions', screen: 'Transactions', icon: 'swap-horizontal' },
    { title: 'Paramètres', screen: 'Parametres', icon: 'settings' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      if (onCloseMenu) onCloseMenu();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const handleNavigation = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
    if (!isLargeScreen && onCloseMenu) {
      onCloseMenu();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {!isLargeScreen && (
          <TouchableOpacity style={styles.closeButton} onPress={onCloseMenu}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        )}
        
        <View style={styles.profileSection}>
          <Avatar />
        </View>

        <View style={styles.menuItems}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.screen)}
            >
              <Ionicons name={item.icon} size={24} color="#2c3e50" />
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={24} color="#e74c3c" />
          <Text style={[styles.menuText, styles.signOutText]}>Se déconnecter</Text>
        </TouchableOpacity>
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
    padding: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  menuItems: {
    flex: 1,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  signOutText: {
    color: '#e74c3c',
  },
});

export default VerticalMenu;
