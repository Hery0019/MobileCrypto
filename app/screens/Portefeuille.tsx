import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

interface CryptoWallet {
  id: string;
  cryptoName: string;
  valeur: number;
}

interface Transaction {
  id: string;
  valeur: number;
  is_depot: boolean;
  dateStr: string;
  timeStr: string;
}

const Portefeuille = () => {
  const [solde, setSolde] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [showRetraitModal, setShowRetraitModal] = useState(false);
  const [montant, setMontant] = useState('');
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [historiqueTransactions, setHistoriqueTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = FIREBASE_AUTH.currentUser;
        if (!user?.email) {
          setError('Utilisateur non connecté');
          return;
        }

        // Récupérer les données de l'utilisateur
        const userDoc = await getDoc(doc(FIREBASE_DB, 'utilisateurs', user.email));
        if (!userDoc.exists()) {
          setError('Utilisateur non trouvé');
          return;
        }

        setSolde(userDoc.data().porteFeuille || 0);

        // Récupérer les wallets de l'utilisateur
        const walletsQuery = query(
          collection(FIREBASE_DB, 'cryptowallet'),
          where('user', '==', doc(FIREBASE_DB, 'utilisateurs', user.email))
        );

        const walletsSnapshot = await getDocs(walletsQuery);
        const walletsPromises = walletsSnapshot.docs.map(async (walletDoc) => {
          const walletData = walletDoc.data();
          // Récupérer les données de la crypto
          const cryptoDoc = await getDoc(walletData.crypto);
          console.log("Données de la crypto:", cryptoDoc.data());
          console.log("Référence de la crypto:", walletData.crypto.path);
          
          if (cryptoDoc.exists()) {
            const cryptoData = cryptoDoc.data();
            console.log("Nom de la crypto trouvé:", cryptoData.name || cryptoData.nom);
            return {
              id: walletDoc.id,
              cryptoName: cryptoData.name || cryptoData.nom || 'Unknown',
              valeur: walletData.valeur || 0
            };
          } else {
            console.log("Document crypto non trouvé pour:", walletData.crypto.path);
            return {
              id: walletDoc.id,
              cryptoName: 'Unknown',
              valeur: walletData.valeur || 0
            };
          }
        });

        const wallets = await Promise.all(walletsPromises);
        setCryptoWallets(wallets);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données');
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const getAllTransactions = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email) {
        console.error('Pas d\'utilisateur connecté');
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const transactionsQuery = query(
        collection(FIREBASE_DB, 'historiquedepot'),
        where('utilisateur', '==', userRef)
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);
      if (transactionsSnapshot.empty) {
        setHistoriqueTransactions([]);
        return;
      }

      const transactions: Transaction[] = [];

      transactionsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Transaction brute:', data);

        // Déterminer la date de la transaction
        let date = new Date();
        if (data.dateheure?.seconds) {
          date = new Date(data.dateheure.seconds * 1000);
        } else if (data.date?.seconds) {
          date = new Date(data.date.seconds * 1000);
        }

        // Déterminer le type et le montant
        const isDepot = data.is_depot !== undefined ? data.is_depot : 
                       data.type === 'depot';
        const montant = data.valeur || data.montant || 0;

        transactions.push({
          id: doc.id,
          valeur: montant,
          is_depot: isDepot,
          dateStr: date.toLocaleDateString(),
          timeStr: date.toLocaleTimeString()
        });
      });

      // Tri des transactions par date (plus récentes en premier)
      transactions.sort((a, b) => {
        const dateA = new Date(a.dateStr).getTime();
        const dateB = new Date(b.dateStr).getTime();
        return dateB - dateA;
      });

      setHistoriqueTransactions(transactions);

    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      Alert.alert(
        'Erreur',
        'Impossible de récupérer l\'historique des transactions. Veuillez réessayer.'
      );
    }
  };

  const handleTransaction = async (isDepot: boolean) => {
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    const montantNum = Number(montant);
    const user = FIREBASE_AUTH.currentUser;
    if (!user?.email) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('Utilisateur non trouvé');
      }

      const currentSolde = userDoc.data().porteFeuille || 0;

      if (!isDepot && currentSolde < montantNum) {
        Alert.alert('Erreur', 'Solde insuffisant');
        return;
      }

      // Mettre à jour le solde
      const newSolde = isDepot ? currentSolde + montantNum : currentSolde - montantNum;
      await updateDoc(userRef, {
        porteFeuille: newSolde
      });

      // Ajouter l'historique de la transaction
      const transactionData = {
        utilisateur: userRef,
        valeur: montantNum,
        dateheure: serverTimestamp(),
        is_depot: isDepot
      };
      
      const docRef = await addDoc(collection(FIREBASE_DB, 'historiquedepot'), transactionData);

      setSolde(newSolde);
      setMontant('');
      setShowDepotModal(false);
      setShowRetraitModal(false);
      Alert.alert('Succès', `${isDepot ? 'Dépôt' : 'Retrait'} effectué avec succès`);
    } catch (error) {
      console.error('Erreur lors de la transaction:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la transaction');
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionModal = (isDepot: boolean) => (
    <Modal
      visible={isDepot ? showDepotModal : showRetraitModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isDepot ? 'Dépôt' : 'Retrait'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Montant"
            keyboardType="numeric"
            value={montant}
            onChangeText={setMontant}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setMontant('');
                isDepot ? setShowDepotModal(false) : setShowRetraitModal(false);
              }}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => handleTransaction(isDepot)}
            >
              <Text style={styles.buttonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHistoriqueModal = () => (
    <Modal
      visible={showHistoriqueModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.historiqueContent]}>
          <Text style={styles.modalTitle}>Historique des transactions</Text>
          {historiqueTransactions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="document-text-outline" size={50} color="#95a5a6" />
              <Text style={styles.emptyStateText}>Aucune transaction trouvée</Text>
            </View>
          ) : (
            <ScrollView style={styles.historiqueList}>
              {historiqueTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.historiqueItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={[
                      styles.historiqueMontant,
                      transaction.is_depot ? styles.depotText : styles.retraitText
                    ]}>
                      {transaction.is_depot ? '+ ' : '- '}
                      ${transaction.valeur.toLocaleString()}
                    </Text>
                    <Text style={[
                      styles.historiqueType,
                      transaction.is_depot ? styles.depotTypeText : styles.retraitTypeText
                    ]}>
                      {transaction.is_depot ? '⬆️ Dépôt' : '⬇️ Retrait'}
                    </Text>
                  </View>
                  <Text style={styles.historiqueDate}>
                    📅 {transaction.dateStr}
                    {'\n'}
                    🕒 {transaction.timeStr}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.fermerButton}
            onPress={() => setShowHistoriqueModal(false)}
          >
            <Ionicons name="close-circle-outline" size={24} color="#fff" />
            <Text style={styles.fermerButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon Portefeuille</Text>
        <View style={styles.totalValue}>
          <Text style={styles.totalValueLabel}>Solde Disponible</Text>
          <Text style={styles.totalValueAmount}>${solde?.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.transactionButton, styles.depositButton]}
            onPress={() => setShowDepotModal(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Dépôt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.transactionButton, styles.withdrawButton]}
            onPress={() => setShowRetraitModal(true)}
          >
            <Ionicons name="remove-circle-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Retrait</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Mes Cryptomonnaies</Text>
      <ScrollView style={styles.assetList}>
        {cryptoWallets.map((wallet) => (
          <TouchableOpacity key={wallet.id} style={styles.assetCard}>
            <View style={styles.assetInfo}>
              <Text style={styles.assetName}>{wallet.cryptoName}</Text>
            </View>
            <View style={styles.assetValues}>
              <View style={styles.valueContainer}>
                <Text style={styles.assetLabel}>Quantité :</Text>
                <Text style={styles.assetValue}>
                  {wallet.valeur.toLocaleString()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.historiqueButton}
          onPress={() => {
            getAllTransactions();
            setShowHistoriqueModal(true);
          }}
        >
          <Ionicons name="time-outline" size={28} color="#fff" />
          <Text style={styles.historiqueButtonText}>Historique des transactions</Text>
        </TouchableOpacity>
      </View>

      {renderTransactionModal(true)}
      {renderTransactionModal(false)}
      {renderHistoriqueModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  totalValue: {
    marginTop: 10,
  },
  totalValueLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  totalValueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: 20,
  },
  assetList: {
    paddingHorizontal: 20,
  },
  assetCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  assetValues: {
    alignItems: 'flex-end',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  assetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  transactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  depositButton: {
    backgroundColor: '#2ecc71',
  },
  withdrawButton: {
    backgroundColor: '#e74c3c',
  },
  historiqueButton: {
    backgroundColor: '#4a69bd',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 5,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  historiqueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  historiqueContent: {
    maxHeight: '80%',
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#2ecc71',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  historiqueList: {
    marginVertical: 15,
  },
  historiqueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  historiqueMontant: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  historiqueType: {
    fontSize: 14,
    marginBottom: 2,
  },
  historiqueDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  depotText: {
    color: '#27ae60',
  },
  retraitText: {
    color: '#e74c3c',
  },
  depotTypeText: {
    color: '#2ecc71',
  },
  retraitTypeText: {
    color: '#e74c3c',
  },
  fermerButton: {
    backgroundColor: '#95a5a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 15,
    elevation: 2,
  },
  fermerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
    textAlign: 'center',
  },
  bottomContainer: {
    padding: 15,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
});

export default Portefeuille;
