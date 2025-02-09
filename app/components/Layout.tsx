import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import VerticalMenu from './VerticalMenu';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { width, height } = Dimensions.get('window');
  const isLargeScreen = width > 768;
  const insets = useSafeAreaInsets();

  const toggleMenu = () => {
    setIsMenuVisible(!isMenuVisible);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {(!isLargeScreen && !isMenuVisible) && (
          <TouchableOpacity 
            style={[styles.menuButton, { top: Math.max(insets.top + 10, 20) }]} 
            onPress={toggleMenu}
          >
            <Ionicons name="menu" size={30} color="#2c3e50" />
          </TouchableOpacity>
        )}
        
        {(isLargeScreen || isMenuVisible) && (
          <View style={[
            styles.menuContainer, 
            !isLargeScreen && styles.absoluteMenu,
            { paddingTop: Math.max(insets.top, 20) }
          ]}>
            <VerticalMenu onCloseMenu={() => setIsMenuVisible(false)} />
          </View>
        )}
        
        <View style={[
          styles.content,
          isLargeScreen && styles.contentWithMenu,
          !isLargeScreen && { paddingTop: 60 }
        ]}>
          {children}
        </View>
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
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
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
    width: Math.min(250, Dimensions.get('window').width * 0.7),
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    padding: 10,
  },
  contentWithMenu: {
    marginLeft: Math.min(250, Dimensions.get('window').width * 0.7),
  },
});

export default Layout;
