import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { FIREBASE_STORAGE } from '../../FirebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { updateUserPresentation } from '../services/firestore';

const AVATAR_SIZE = 256;

const Avatar = () => {
  const { user } = useAuth();
  const avatarUrl = user?.photoURL ?? null;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à la caméra');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      // Recadrage à 256 px et compression JPEG avant envoi : un avatar pèse
      // quelques dizaines de Ko au lieu de plusieurs Mo (photo 12 Mpx),
      // et reste sous la limite des règles Storage (5 Mo).
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      const response = await fetch(resized.uri);
      const blob = await response.blob();

      const storageRef = ref(FIREBASE_STORAGE, `avatars/${user?.uid}`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      
      const downloadURL = await getDownloadURL(storageRef);
      
      // Le profil est abonné en temps réel dans AuthProvider : l'avatar se
      // met à jour dès que Firestore confirme l'écriture.
      if (user?.uid) {
        await updateUserPresentation(user.uid, { photoURL: downloadURL });
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Alert.alert('Erreur', 'Impossible de télécharger l\'image');
    }
  };

  const handlePress = () => {
    Alert.alert(
      'Modifier la photo de profil',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: takePhoto
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: pickImage
        },
        {
          text: 'Annuler',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePress} style={styles.avatarContainer}>
        <Image
          source={avatarUrl ? { uri: avatarUrl } : require('../../assets/default-avatar.png')}
          style={styles.avatar}
        />
      </TouchableOpacity>
      <Text style={styles.userName}>{user?.displayName || 'Utilisateur'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
});

export default Avatar;
