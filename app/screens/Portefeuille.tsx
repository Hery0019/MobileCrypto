import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();

  // Mapping des IDs aux noms des cryptos
  const cryptoNames: { [key: string]: string } = {
    '1': 'Bitcoin',
    '2': 'Ethereum',
    '3': 'Cardano'
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setError('Utilisateur non connecté');
        setLoading(false);
        return;
      }

      try {
        console.log('Récupération des données utilisateur pour:', user.uid);
        
        // 1. Récupérer les données de l'utilisateur
        const userRef = doc(FIREBASE_DB, 'utilisateurs', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          setError('Utilisateur non trouvé');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        console.log('Données utilisateur récupérées:', {
          uid: user.uid,
          solde: userData.porteFeuille
        });
        
        setSolde(userData.porteFeuille || 0);

        // 2. Créer des wallets vides pour toutes les cryptos
        const emptyWallets = Object.entries(cryptoNames).map(([id, name]) => ({
          id,
          cryptoName: name,
          valeur: 0
        }));

        // 3. Récupérer les wallets de l'utilisateur
        const walletsQuery = query(
          collection(FIREBASE_DB, 'cryptoWallet'),
          where('utilisateur', '==', user.email)
        );

        const walletsSnapshot = await getDocs(walletsQuery);
        console.log('Wallets trouvés:', walletsSnapshot.docs.length);
        
        // 4. Mettre à jour les valeurs des wallets existants
        const userWallets = new Map(emptyWallets.map(w => [w.id, w]));
        
        walletsSnapshot.docs.forEach(walletDoc => {
          const walletData = walletDoc.data();
          const cryptoId = walletData.crypto.toString();
          console.log('Wallet trouvé:', { cryptoId, walletData });
          
          if (userWallets.has(cryptoId)) {
            userWallets.set(cryptoId, {
              id: walletDoc.id,
              cryptoName: cryptoNames[cryptoId],
              valeur: walletData.valeur || 0
            });
          }
        });

        const finalWallets = Array.from(userWallets.values());
        console.log('Wallets finaux:', finalWallets);
        setCryptoWallets(finalWallets);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const getAllTransactions = async () => {
    if (!user?.uid) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    try {
      // Admin écrit 'utilisateur' comme uid (string) : comparer avec le même type,
      // une DocumentReference ne matcherait jamais.
      const transactionsQuery = query(
        collection(FIREBASE_DB, 'historiquedepot'),
        where('utilisateur', '==', user.uid)
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.dateheure?.toDate() || data.date?.toDate() || new Date();
        
        return {
          id: doc.id,
          valeur: data.valeur || data.montant || 0,
          is_depot: data.is_depot !== undefined ? data.is_depot : data.type === 'depot',
          dateStr: date.toLocaleDateString(),
          timeStr: date.toLocaleTimeString()
        };
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
        'Impossible de récupérer l\'historique des transactions'
      );
    }
  };

  const handleDemandeDepot = async () => {
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    try {
      const montantNumber = Number(montant);
      
      // Créer une nouvelle notification de dépôt
      await addDoc(collection(FIREBASE_DB, 'notifications'), {
        type: 'depot',
        montant: montantNumber,
        utilisateur: user?.uid,
        userEmail: user?.email,
        status: 'en_attente',
        date_creation: serverTimestamp()
      });

      setMontant('');
      setShowDepotModal(false);
      Alert.alert('Succès', 'Votre demande de dépôt a été envoyée avec succès');
    } catch (error) {
      console.error('Erreur lors de la demande de dépôt:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la demande de dépôt');
    }
  };

  const handleDemandeRetrait = async () => {
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    const montantNumber = Number(montant);
    if (solde !== null && montantNumber > solde) {
      Alert.alert('Erreur', 'Le montant demandé dépasse votre solde disponible');
      return;
    }

    try {
      // Créer une nouvelle notification de retrait
      await addDoc(collection(FIREBASE_DB, 'notifications'), {
        type: 'retrait',
        montant: montantNumber,
        utilisateur: user?.uid,
        userEmail: user?.email,
        status: 'en_attente',
        date_creation: serverTimestamp()
      });

      setMontant('');
      setShowRetraitModal(false);
      Alert.alert('Succès', 'Votre demande de retrait a été envoyée avec succès');
    } catch (error) {
      console.error('Erreur lors de la demande de retrait:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la demande de retrait');
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
              onPress={() => isDepot ? handleDemandeDepot() : handleDemandeRetrait()}
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

  const renderWallet = ({ item }: { item: CryptoWallet }) => (
    <View style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <Text style={styles.cryptoName}>{item.cryptoName}</Text>
        <Text style={styles.walletValue}>{item.valeur.toFixed(4)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceAmount}>${solde?.toLocaleString()}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.depositButton]}
              onPress={() => setShowDepotModal(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Dépôt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={() => setShowRetraitModal(true)}
            >
              <Ionicons name="remove-circle-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Retrait</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => {
                getAllTransactions();
                setShowHistoriqueModal(true);
              }}
            >
              <Ionicons name="time-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Historique</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cryptoContainer}>
            <Text style={styles.sectionTitle}>Mes Cryptomonnaies</Text>
            {cryptoWallets.map(wallet => (
              <View key={wallet.id} style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Text style={styles.cryptoName}>{wallet.cryptoName}</Text>
                  <Text style={styles.walletValue}>{wallet.valeur.toFixed(4)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  balanceContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  depositButton: {
    backgroundColor: '#2ecc71',
  },
  withdrawButton: {
    backgroundColor: '#e74c3c',
  },
  historyButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  cryptoContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  walletCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cryptoName: {
    fontSize: 16,
    color: '#2c3e50',
  },
  walletValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2ecc71',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default Portefeuille;
