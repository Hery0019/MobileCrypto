import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface Crypto {
  nom: string;
  montant: number;
  symbole: string;
}

const Portefeuille = () => {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [montantDepot, setMontantDepot] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);

  useEffect(() => {
    fetchCryptos();
  }, []);

  const fetchCryptos = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email) {
        console.error('Utilisateur non connecté');
        return;
      }

      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const walletsQuery = query(
        collection(FIREBASE_DB, 'portefeuilles'),
        where('utilisateur', '==', userRef)
      );

      const querySnapshot = await getDocs(walletsQuery);
      const cryptoMap = new Map<string, Crypto>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.nom && !cryptoMap.has(data.nom)) {
          cryptoMap.set(data.nom, {
            nom: data.nom,
            montant: data.montant || 0,
            symbole: data.symbole || '',
          });
        }
      });

      setCryptos(Array.from(cryptoMap.values()));
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des cryptos:', error);
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedCrypto || !montantDepot) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const notificationRef = collection(FIREBASE_DB, 'notifications');

      // Créer une notification de dépôt
      await updateDoc(userRef, {
        notifications: arrayUnion({
          type: 'depot',
          montant: parseFloat(montantDepot),
          crypto: selectedCrypto.nom,
          date: new Date(),
          status: 'en_attente'
        })
      });

      Alert.alert(
        'Succès',
        'Votre demande de dépôt a été envoyée et est en attente de validation'
      );

      setModalVisible(false);
      setMontantDepot('');
      setSelectedCrypto(null);
    } catch (error) {
      console.error('Erreur lors du dépôt:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du dépôt');
    }
  };

  const renderCryptoCard = (crypto: Crypto) => (
    <TouchableOpacity
      key={crypto.nom}
      style={styles.cryptoCard}
      onPress={() => {
        setSelectedCrypto(crypto);
        setModalVisible(true);
      }}
    >
      <View style={styles.cryptoIcon}>
        <Ionicons name="logo-bitcoin" size={30} color="#F7931A" />
      </View>
      <View style={styles.cryptoInfo}>
        <Text style={styles.cryptoName}>{crypto.nom}</Text>
        <Text style={styles.cryptoSymbol}>{crypto.symbole}</Text>
      </View>
      <View style={styles.cryptoAmount}>
        <Text style={styles.amount}>{crypto.montant}</Text>
        <Text style={styles.amountLabel}>{crypto.symbole}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon Portefeuille</Text>
      </View>

      <ScrollView style={styles.cryptoList}>
        {cryptos.length > 0 ? (
          cryptos.map(renderCryptoCard)
        ) : (
          <Text style={styles.emptyText}>Aucune crypto-monnaie trouvée</Text>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Dépôt de {selectedCrypto?.nom}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Montant"
              keyboardType="numeric"
              value={montantDepot}
              onChangeText={setMontantDepot}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDeposit}
              >
                <Text style={styles.buttonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cryptoList: {
    flex: 1,
    padding: 15,
  },
  cryptoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cryptoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff9f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cryptoInfo: {
    flex: 1,
    marginLeft: 15,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cryptoSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cryptoAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default Portefeuille;
