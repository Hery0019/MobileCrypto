import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';

interface Transaction {
  id: string;
  type: 'achat' | 'vente';
  cryptoName: string;
  cryptoSymbol: string;
  amount: number;
  price: number;
  date: Date;
}

interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [solde, setSolde] = useState<number>(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [amount, setAmount] = useState(0);
  const [availableCryptos, setAvailableCryptos] = useState<Crypto[]>([]);
  const [userCryptos, setUserCryptos] = useState<{id: string, name: string, symbol: string, amount: number, price: number}[]>([]);

  const fetchTransactions = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email) return;

      const transactionsRef = collection(FIREBASE_DB, 'transactions');
      const q = query(transactionsRef, where('idUtilisateur', '==', user.email));
      const querySnapshot = await getDocs(q);

      const transactionsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        // Utiliser doc() pour créer une référence au document crypto
        const cryptoRef = doc(FIREBASE_DB, 'cryptocurrencies', data.id_crypto);
        const cryptoDoc = await getDoc(cryptoRef);
        const cryptoData = cryptoDoc.data();

        return {
          id: docSnapshot.id,
          type: data.is_achat ? 'achat' : 'vente',
          cryptoName: cryptoData?.name || '',
          cryptoSymbol: cryptoData?.symbol || '',
          amount: data.valeur,
          price: cryptoData?.price || 0,
          date: data.date_heure instanceof Date ? data.date_heure : data.date_heure.toDate(),
        } as Transaction;
      });

      const loadedTransactions = await Promise.all(transactionsPromises);
      // Trier par date, plus récent en premier
      loadedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  };

  const fetchUserCryptos = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email) return;

      const cryptoWalletRef = collection(FIREBASE_DB, 'cryptowallet');
      const userDocRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const q = query(cryptoWalletRef, where('user', '==', userDocRef));
      const querySnapshot = await getDocs(q);

      const cryptoPromises = querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const cryptoRef = data.crypto;
        const cryptoDoc = await getDoc(cryptoRef);
        const cryptoData = cryptoDoc.data();
        
        return {
          id: cryptoDoc.id,
          name: cryptoData.name,
          symbol: cryptoData.symbol,
          amount: data.valeur,
          price: cryptoData.price
        };
      });

      const userCryptosData = await Promise.all(cryptoPromises);
      setUserCryptos(userCryptosData);
    } catch (error) {
      console.error('Erreur lors de la récupération des cryptos de l\'utilisateur:', error);
    }
  };

  const handleConfirmPurchase = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email || !selectedCrypto) return;

      const totalCost = purchaseAmount * (selectedCrypto.price || 0);
      if (totalCost > solde) {
        Alert.alert('Erreur', 'Solde insuffisant pour effectuer cet achat');
        return;
      }

      // 1. Mettre à jour le solde de l'utilisateur
      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      await updateDoc(userRef, {
        porteFeuille: solde - totalCost
      });

      // 2. Mettre à jour ou créer le cryptowallet
      const cryptoWalletRef = collection(FIREBASE_DB, 'cryptowallet');
      const userDocRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const cryptoDocRef = doc(FIREBASE_DB, 'cryptocurrencies', selectedCrypto.id);
      
      const q = query(
        cryptoWalletRef, 
        where('user', '==', userDocRef),
        where('crypto', '==', cryptoDocRef)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Créer un nouveau cryptowallet
        await addDoc(cryptoWalletRef, {
          crypto: cryptoDocRef,
          user: userDocRef,
          valeur: purchaseAmount
        });
      } else {
        // Mettre à jour le cryptowallet existant
        const walletDoc = querySnapshot.docs[0];
        const currentAmount = walletDoc.data().valeur || 0;
        await updateDoc(walletDoc.ref, {
          valeur: currentAmount + purchaseAmount
        });
      }

      // 3. Créer une nouvelle transaction
      const transactionRef = collection(FIREBASE_DB, 'transactions');
      await addDoc(transactionRef, {
        is_achat: true,
        date_heure: new Date(),
        valeur: purchaseAmount,
        idUtilisateur: user.email,
        id_crypto: selectedCrypto.id
      });

      // 4. Mettre à jour l'interface
      setSolde(solde - totalCost);
      setShowBuyModal(false);
      setPurchaseAmount(0);
      setSelectedCrypto(null);

      // 5. Rafraîchir la liste des transactions
      fetchTransactions();

      Alert.alert('Succès', 'Achat effectué avec succès!');
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'achat');
    }
  };

  const handleConfirmSell = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email || !selectedCrypto) return;

      // Vérifier si l'utilisateur a assez de crypto à vendre
      const userCrypto = userCryptos.find(c => c.id === selectedCrypto.id);
      if (!userCrypto || userCrypto.amount < amount) {
        Alert.alert('Erreur', 'Montant insuffisant pour effectuer cette vente');
        return;
      }

      const totalValue = amount * (selectedCrypto.price || 0);

      // 1. Mettre à jour le solde de l'utilisateur
      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      await updateDoc(userRef, {
        porteFeuille: solde + totalValue
      });

      // 2. Mettre à jour le cryptowallet
      const cryptoWalletRef = collection(FIREBASE_DB, 'cryptowallet');
      const userDocRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const cryptoDocRef = doc(FIREBASE_DB, 'cryptocurrencies', selectedCrypto.id);
      
      const q = query(
        cryptoWalletRef, 
        where('user', '==', userDocRef),
        where('crypto', '==', cryptoDocRef)
      );
      
      const querySnapshot = await getDocs(q);
      const walletDoc = querySnapshot.docs[0];
      const currentAmount = walletDoc.data().valeur;
      
      if (currentAmount === amount) {
        // Si l'utilisateur vend tout, supprimer le document
        await deleteDoc(walletDoc.ref);
      } else {
        // Sinon, mettre à jour le montant
        await updateDoc(walletDoc.ref, {
          valeur: currentAmount - amount
        });
      }

      // 3. Créer une nouvelle transaction
      const transactionRef = collection(FIREBASE_DB, 'transactions');
      await addDoc(transactionRef, {
        is_achat: false,
        date_heure: new Date(),
        valeur: amount,
        idUtilisateur: user.email,
        id_crypto: selectedCrypto.id
      });

      // 4. Mettre à jour l'interface
      setSolde(solde + totalValue);
      setShowSellModal(false);
      setAmount(0);
      setSelectedCrypto(null);

      // 5. Rafraîchir les données
      fetchTransactions();
      fetchUserCryptos();

      Alert.alert('Succès', 'Vente effectuée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la vente:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la vente');
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = FIREBASE_AUTH.currentUser;
        if (!user?.email) return;

        const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSolde(userData.porteFeuille || 0);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du solde:', error);
      }
    };

    const fetchCryptos = async () => {
      try {
        console.log('Récupération des cryptos...');
        const cryptosRef = collection(FIREBASE_DB, 'cryptocurrencies');
        const querySnapshot = await getDocs(cryptosRef);
        
        const cryptos: Crypto[] = [];
        querySnapshot.forEach((doc) => {
          const cryptoData = doc.data();
          cryptos.push({
            id: doc.id,
            name: cryptoData.name,
            symbol: cryptoData.symbol,
            price: cryptoData.price || 0,
          });
        });

        console.log('Cryptos récupérées:', cryptos);
        setAvailableCryptos(cryptos);
      } catch (error) {
        console.error('Erreur lors de la récupération des cryptos:', error);
      }
    };

    fetchUserData();
    fetchCryptos();
    fetchTransactions();
    fetchUserCryptos();
  }, []);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={[
          styles.transactionType,
          { color: item.type === 'achat' ? '#2ecc71' : '#e74c3c' }
        ]}>
          {item.type.toUpperCase()}
        </Text>
        <Text style={styles.transactionDate}>
          {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <View>
          <Text style={styles.cryptoName}>{item.cryptoName}</Text>
          <Text style={styles.cryptoSymbol}>{item.cryptoSymbol}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{item.amount.toFixed(8)}</Text>
          <Text style={styles.price}>${item.price.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  const handleBuyPress = () => {
    console.log('Bouton Acheter pressé');
    console.log('Cryptos disponibles:', availableCryptos);
    setShowBuyModal(true);
  };

  const handleSellPress = () => {
    console.log('Bouton Vendre pressé');
    console.log('Cryptos de l\'utilisateur:', userCryptos);
    setShowSellModal(true);
  };

  const handleCryptoSelect = (crypto: Crypto) => {
    console.log('Crypto sélectionnée:', crypto);
    setSelectedCrypto(crypto);
    setPurchaseAmount(0);
  };

  const getMaxPurchaseAmount = () => {
    if (!selectedCrypto) return 0;
    const max = solde / selectedCrypto.price;
    console.log('Montant maximum calculé:', max, 'pour un solde de', solde, 'et un prix de', selectedCrypto.price);
    return max;
  };

  const renderBuyModal = () => {
    console.log('Rendu du modal');
    console.log('Solde disponible:', solde);
    console.log('Cryptos disponibles:', availableCryptos);
    console.log('Crypto sélectionnée:', selectedCrypto);
    console.log('Montant actuel:', purchaseAmount);

    return (
      <Modal
        visible={showBuyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowBuyModal(false);
          setSelectedCrypto(null);
          setPurchaseAmount(0);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Acheter des Cryptomonnaies</Text>
            
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCrypto?.id}
                onValueChange={(itemValue) => {
                  const crypto = availableCryptos.find(c => c.id === itemValue);
                  if (crypto) {
                    handleCryptoSelect(crypto);
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Sélectionnez une cryptomonnaie" value="" />
                {availableCryptos.map((crypto) => (
                  <Picker.Item
                    key={crypto.id}
                    label={`${crypto.name} - $${crypto.price.toLocaleString()}`}
                    value={crypto.id}
                  />
                ))}
              </Picker>
            </View>

            {selectedCrypto && (
              <View style={styles.purchaseControls}>
                <Text style={styles.amountLabel}>
                  Montant: {purchaseAmount.toFixed(8)} {selectedCrypto.symbol}
                </Text>
                <Text style={styles.valueLabel}>
                  Valeur: ${(purchaseAmount * selectedCrypto.price).toLocaleString()}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={getMaxPurchaseAmount()}
                  value={purchaseAmount}
                  onValueChange={(value) => {
                    console.log('Nouvelle valeur du slider:', value);
                    setPurchaseAmount(value);
                  }}
                  step={0.00001}
                  minimumTrackTintColor="#2ecc71"
                  maximumTrackTintColor="#bdc3c7"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>0</Text>
                  <Text style={styles.sliderLabel}>
                    Max: {getMaxPurchaseAmount().toFixed(8)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowBuyModal(false);
                  setSelectedCrypto(null);
                  setPurchaseAmount(0);
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  (!selectedCrypto || purchaseAmount === 0) && styles.disabledButton
                ]}
                disabled={!selectedCrypto || purchaseAmount === 0}
                onPress={handleConfirmPurchase}
              >
                <Text style={styles.modalButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderSellModal = () => {
    console.log('Rendu du modal de vente');
    console.log('Solde disponible:', solde);
    console.log('Cryptos de l\'utilisateur:', userCryptos);
    console.log('Crypto sélectionnée:', selectedCrypto);
    console.log('Montant actuel:', amount);

    return (
      <Modal
        visible={showSellModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowSellModal(false);
          setSelectedCrypto(null);
          setAmount(0);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vendre une crypto</Text>

            <Text style={styles.modalLabel}>Sélectionner une crypto:</Text>
            <Picker
              selectedValue={selectedCrypto?.id}
              onValueChange={(itemValue) => {
                const crypto = userCryptos.find(c => c.id === itemValue);
                setSelectedCrypto(crypto || null);
                setAmount(0);
              }}
            >
              <Picker.Item label="Choisir une crypto" value="" />
              {userCryptos.map((crypto) => (
                <Picker.Item 
                  key={crypto.id} 
                  label={`${crypto.name} (${crypto.amount} ${crypto.symbol})`} 
                  value={crypto.id} 
                />
              ))}
            </Picker>

            {selectedCrypto && (
              <>
                <Text style={styles.modalLabel}>
                  Montant à vendre (max: {userCryptos.find(c => c.id === selectedCrypto.id)?.amount || 0} {selectedCrypto.symbol}):
                </Text>
                <Slider
                  minimumValue={0}
                  maximumValue={userCryptos.find(c => c.id === selectedCrypto.id)?.amount || 0}
                  value={amount}
                  onValueChange={setAmount}
                  step={0.00001}
                />
                <Text style={styles.amountText}>
                  {amount.toFixed(5)} {selectedCrypto.symbol}
                </Text>
                <Text style={styles.valueText}>
                  Valeur: ${(amount * (selectedCrypto.price || 0)).toLocaleString()}
                </Text>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSellModal(false);
                  setSelectedCrypto(null);
                  setAmount(0);
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  (!selectedCrypto || amount === 0) && styles.disabledButton
                ]}
                disabled={!selectedCrypto || amount === 0}
                onPress={handleConfirmSell}
              >
                <Text style={styles.modalButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.balance}>Solde: ${solde.toLocaleString()}</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.transactionsList}
      />

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buyButton]}
          onPress={handleBuyPress}
        >
          <Text style={styles.buttonText}>Acheter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.sellButton]}
          onPress={handleSellPress}
        >
          <Text style={styles.buttonText}>Vendre</Text>
        </TouchableOpacity>
      </View>

      {renderBuyModal()}
      {renderSellModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  balance: {
    fontSize: 18,
    color: '#2c3e50',
  },
  transactionsList: {
    padding: 15,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transactionType: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  transactionDate: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cryptoSymbol: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  price: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buyButton: {
    backgroundColor: '#2ecc71',
  },
  sellButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  purchaseControls: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 18,
    marginBottom: 5,
    color: '#2c3e50',
  },
  valueLabel: {
    fontSize: 20,
    marginBottom: 15,
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalLabel: {
    fontSize: 18,
    marginBottom: 10,
    color: '#2c3e50',
  },
  amountText: {
    fontSize: 18,
    marginBottom: 5,
    color: '#2c3e50',
  },
  valueText: {
    fontSize: 20,
    marginBottom: 15,
    color: '#2ecc71',
    fontWeight: 'bold',
  },
});

export default Transactions;
