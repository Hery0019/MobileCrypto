import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerticalMenu from './VerticalMenu';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 768;

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };

  return (
    <View style={styles.container}>
      {(!isLargeScreen && !isMenuVisible) && (
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={30} color="#2c3e50" />
        </TouchableOpacity>
      )}
      
      {(isLargeScreen || isMenuVisible) && (
        <View style={[styles.menuContainer, !isLargeScreen && styles.absoluteMenu]}>
          <VerticalMenu onCloseMenu={() => setIsMenuVisible(false)} />
        </View>
      )}
      
      <View style={[
        styles.content,
        isLargeScreen && styles.contentWithMenu
      ]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menuButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuContainer: {
    width: 250,
    height: '100%',
  },
  absoluteMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  contentWithMenu: {
    marginLeft: 250,
  },
});

export default Layout;
