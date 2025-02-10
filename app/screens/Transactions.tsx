import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';

interface Transaction {
  date_heure: any;
  idUtilisateur: string;
  id_crypto: string;
  is_achat: boolean;
  valeur: number;
  prix_unitaire?: number;
  montant_total?: number;
  cryptoName?: string;
  cryptoSymbol?: string;
}

interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
}

export default function Transactions() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'achat' | 'vente'>('achat');
  const [amount, setAmount] = useState('0');
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [cryptoBalance, setCryptoBalance] = useState<{ [key: string]: number }>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchCryptos();
    fetchTransactions();
    fetchUserBalance();
    fetchCryptoBalance();
  }, [user]);

  const fetchUserBalance = async () => {
    if (!user?.email) return;
    try {
      const usersRef = collection(FIREBASE_DB, 'utilisateurs');
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log('Solde utilisateur récupéré:', userData);
        setUserBalance(userData.porteFeuille || 0);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
    }
  };

  const fetchCryptos = async () => {
    try {
      const cryptosRef = collection(FIREBASE_DB, 'cryptocurrencies');
      const querySnapshot = await getDocs(cryptosRef);
      const cryptosData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Crypto[];

      console.log('Cryptos récupérées:', cryptosData);
      
      if (cryptosData.length > 0) {
        setSelectedCrypto(cryptosData[0]);
        console.log('Crypto sélectionnée:', cryptosData[0]);
      }
      setCryptos(cryptosData);
    } catch (error) {
      console.error('Erreur lors de la récupération des cryptos:', error);
    }
  };

  const fetchCryptoBalance = async (cryptoId?: string) => {
    if (!user?.email) return;

    try {
      const cryptowalletRef = collection(FIREBASE_DB, 'cryptoWallet');
      const q = cryptoId 
        ? query(
            cryptowalletRef,
            where('utilisateur', '==', user.email),
            where('crypto', '==', cryptoId)
          )
        : query(
            cryptowalletRef,
            where('utilisateur', '==', user.email)
          );
      
      const querySnapshot = await getDocs(q);
      const balances: { [key: string]: number } = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        balances[data.crypto] = data.valeur || 0;
      });
      
      setCryptoBalance(balances);
    } catch (error) {
      console.error('Erreur lors de la récupération du solde en crypto:', error);
    }
  };

  const fetchTransactions = async () => {
    if (!user?.email) return;
    try {
      const transactionsRef = collection(FIREBASE_DB, 'transactions');
      const q = query(
        transactionsRef,
        where('idUtilisateur', '==', user.email),
        orderBy('date_heure', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactionsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Récupérer les détails de la crypto
        const cryptoRef = doc(FIREBASE_DB, 'cryptocurrencies', data.id_crypto);
        const cryptoDoc = await getDoc(cryptoRef);
        const cryptoData = cryptoDoc.data();

        return {
          id: docSnapshot.id,
          ...data,
          date_heure: data.date_heure.toDate(),
          cryptoName: cryptoData?.name || 'Crypto inconnue',
          cryptoSymbol: cryptoData?.symbol || '???',
        } as Transaction;
      });

      const loadedTransactions = await Promise.all(transactionsPromises);
      console.log('Transactions récupérées:', loadedTransactions);
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  };

  const handleInitiateTransaction = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (!selectedCrypto?.id) {
      Alert.alert('Erreur', 'Veuillez sélectionner une crypto-monnaie');
      return;
    }

    if (!user?.email) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    try {
      const numericAmount = Number(amount);
      const totalPrice = numericAmount * selectedCrypto.price;

      // 1. Vérifier le solde de l'utilisateur
      const usersRef = collection(FIREBASE_DB, 'utilisateurs');
      const userQuery = query(usersRef, where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('Utilisateur non trouvé');
      }

      const userDoc = userSnapshot.docs[0];
      const currentBalance = userDoc.data().porteFeuille || 0;

      // 2. Vérifier le cryptoWallet existant
      const cryptowalletRef = collection(FIREBASE_DB, 'cryptoWallet');
      const walletQuery = query(
        cryptowalletRef,
        where('utilisateur', '==', user.email),
        where('crypto', '==', selectedCrypto.id.toString())
      );
      
      const walletSnapshot = await getDocs(walletQuery);
      let cryptoAmount = 0;
      let walletDocRef = null;

      if (walletSnapshot.empty) {
        // Pas de wallet pour cette crypto
        if (selectedType === 'vente') {
          Alert.alert('Erreur', 'Vous ne possédez pas cette crypto-monnaie');
          return;
        }
      } else {
        walletDocRef = walletSnapshot.docs[0].ref;
        cryptoAmount = walletSnapshot.docs[0].data().valeur || 0;
      }

      // 3. Vérifier les conditions de la transaction
      if (selectedType === 'achat') {
        if (currentBalance < totalPrice) {
          Alert.alert('Erreur', 'Solde insuffisant pour cet achat');
          return;
        }
      } else { // Vente
        if (!walletDocRef) {
          Alert.alert('Erreur', 'Vous ne possédez pas cette crypto-monnaie');
          return;
        }
        if (cryptoAmount < numericAmount) {
          Alert.alert('Erreur', 'Solde en crypto insuffisant pour cette vente');
          return;
        }
      }

      // 4. Mettre à jour ou créer le cryptoWallet
      if (selectedType === 'achat') {
        if (walletDocRef) {
          // Mettre à jour le wallet existant
          await updateDoc(walletDocRef, {
            valeur: cryptoAmount + numericAmount
          });
        } else {
          // Créer un nouveau wallet
          await addDoc(cryptowalletRef, {
            utilisateur: user.email,
            crypto: selectedCrypto.id.toString(),
            valeur: numericAmount
          });
        }
      } else {
        // Mise à jour pour une vente
        await updateDoc(walletDocRef, {
          valeur: cryptoAmount - numericAmount
        });
      }

      // 5. Mettre à jour le solde de l'utilisateur
      const newBalance = selectedType === 'achat'
        ? currentBalance - totalPrice
        : currentBalance + totalPrice;

      await updateDoc(userDoc.ref, { porteFeuille: newBalance });

      // 6. Créer la transaction
      const transactionRef = collection(FIREBASE_DB, 'transactions');
      await addDoc(transactionRef, {
        is_achat: selectedType === 'achat',
        date_heure: serverTimestamp(),
        valeur: numericAmount,
        idUtilisateur: user.email,
        id_crypto: selectedCrypto.id.toString(),
        prix_unitaire: selectedCrypto.price,
        montant_total: totalPrice
      });

      // 7. Rafraîchir les données
      setModalVisible(false);
      setAmount('0');
      fetchTransactions();
      fetchUserBalance();
      fetchCryptoBalance();

      Alert.alert(
        'Succès',
        `Transaction effectuée avec succès!\n${selectedType === 'achat' ? 'Acheté' : 'Vendu'} ${numericAmount} ${selectedCrypto.name}\nNouveau solde: $${newBalance.toLocaleString()}\nCrypto: ${selectedType === 'achat' ? cryptoAmount + numericAmount : cryptoAmount - numericAmount} ${selectedCrypto.name}`
      );
    } catch (error) {
      console.error('Erreur détaillée lors de la transaction:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la transaction. Vérifiez les logs pour plus de détails.');
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const date = item.date_heure instanceof Date ? item.date_heure : new Date(item.date_heure);
    const montantTotal = item.valeur * (item.prix_unitaire || 0);
    
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionTypeContainer}>
            <Text style={[styles.transactionType, { color: item.is_achat ? '#4CAF50' : '#F44336' }]}>
              {item.is_achat ? 'Achat' : 'Vente'}
            </Text>
            <Text style={styles.cryptoName}>{item.cryptoName}</Text>
          </View>
          <Text style={styles.transactionDate}>
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Montant:</Text>
            <Text style={styles.detailValue}>
              {item.valeur.toFixed(4)} {item.cryptoSymbol}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prix unitaire:</Text>
            <Text style={styles.detailValue}>
              ${item.prix_unitaire?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.detailValue}>
              ${montantTotal.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const getMaxAmount = () => {
    if (!selectedCrypto?.id) return 0;
    if (selectedType === 'achat') {
      return selectedCrypto.price ? userBalance / selectedCrypto.price : 0;
    } else {
      return cryptoBalance[selectedCrypto.id.toString()] || 0;
    }
  };

  const handleCryptoChange = async (itemValue: string) => {
    const crypto = cryptos.find(c => c.id === itemValue);
    if (crypto) {
      setSelectedCrypto(crypto);
      setAmount('0');
      await fetchCryptoBalance(crypto.id.toString());
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>Nouvelle Transaction</Text>
      </TouchableOpacity>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item, index) => index.toString()}
        style={styles.transactionList}
        ListEmptyComponent={() => (
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        )}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedType === 'achat' ? 'Acheter' : 'Vendre'} une crypto-monnaie
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedType === 'achat' && styles.selectedButton
                ]}
                onPress={() => {
                  setSelectedType('achat');
                  setAmount('0');
                }}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedType === 'achat' && styles.selectedButtonText
                ]}>Acheter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedType === 'vente' && styles.selectedButton
                ]}
                onPress={() => {
                  setSelectedType('vente');
                  setAmount('0');
                }}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedType === 'vente' && styles.selectedButtonText
                ]}>Vendre</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.balanceInfo}>
              <Text style={styles.balanceText}>
                {selectedType === 'achat' 
                  ? `Solde disponible: $${userBalance.toLocaleString()}`
                  : selectedCrypto
                    ? `Solde disponible: ${cryptoBalance[selectedCrypto.id.toString()] || 0} ${selectedCrypto.name}`
                    : 'Sélectionnez une crypto-monnaie'
                }
              </Text>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.inputLabel}>Sélectionnez une crypto-monnaie</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={selectedCrypto?.id}
                  onValueChange={handleCryptoChange}
                  style={styles.pickerStyle}
                  mode="dropdown"
                >
                  <Picker.Item 
                    label="Sélectionnez une crypto-monnaie" 
                    value="" 
                    enabled={false}
                  />
                  {cryptos.map((crypto) => (
                    <Picker.Item 
                      key={crypto.id} 
                      label={`${crypto.name} (${crypto.price.toLocaleString()}$) - Solde: ${cryptoBalance[crypto.id.toString()] || 0}`}
                      value={crypto.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {selectedCrypto && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {selectedType === 'achat' 
                    ? `Montant à acheter (Max: ${getMaxAmount().toFixed(4)} ${selectedCrypto.name})`
                    : `Montant à vendre (Max: ${getMaxAmount().toFixed(4)} ${selectedCrypto.name})`
                  }
                </Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={getMaxAmount()}
                    value={Number(amount)}
                    onValueChange={(value) => setAmount(value.toFixed(4))}
                    minimumTrackTintColor="#2ecc71"
                    maximumTrackTintColor="#bdc3c7"
                  />
                  <Text style={styles.amountText}>{amount} {selectedCrypto.name}</Text>
                  {selectedType === 'achat' && (
                    <Text style={styles.totalText}>
                      Total: ${(Number(amount) * selectedCrypto.price).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!amount || Number(amount) <= 0) && styles.disabledButton
              ]}
              onPress={handleInitiateTransaction}
              disabled={!amount || Number(amount) <= 0}
            >
              <Text style={styles.submitButtonText}>
                {selectedType === 'achat' ? 'Acheter' : 'Vendre'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  transactionList: {
    padding: 15,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  cryptoName: {
    fontSize: 16,
    color: '#666',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
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
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#2c3e50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  typeButton: {
    backgroundColor: '#f5f6fa',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%',
    borderColor: '#2c3e50',
    borderWidth: 1,
  },
  selectedButton: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedButtonText: {
    color: '#fff',
  },
  balanceInfo: {
    marginBottom: 20,
  },
  balanceText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  pickerStyle: {
    height: 50,
    width: '100%',
    color: '#2c3e50',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  sliderContainer: {
    marginTop: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  amountText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '500',
    marginTop: 10,
  },
  totalText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  submitButton: {
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#2ecc71',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
