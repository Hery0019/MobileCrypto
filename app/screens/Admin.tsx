import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { collection, getDocs, getDoc, doc as firestoreDoc, updateDoc, addDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  email: string;
  role: string;
  porteFeuille: number;
}

interface Transaction {
  id: string;
  is_achat: boolean;
  date_heure: Date;
  valeur: number;
  idUtilisateur: string;
  id_crypto: string;
  cryptoName?: string;
  cryptoSymbol?: string;
  userEmail?: string;
}

interface Notification {
  id: string;
  type: 'depot' | 'retrait';
  montant: number;
  utilisateur: any;
  userEmail: string;
  status: 'en_attente' | 'validee' | 'refusee';
  date_creation: Date;
  date_validation?: Date;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'notifications'>('notifications');
  const { setUser } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    fetchUsers();
    fetchTransactions();
    fetchNotifications();
  };

  const handleLogout = async () => {
    try {
      await FIREBASE_AUTH.signOut();
      setUser(null);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = collection(FIREBASE_DB, 'utilisateurs');
      const querySnapshot = await getDocs(usersRef);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as User));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
    }
  };

  // Mapping des IDs aux noms des cryptos
  const cryptoNames: { [key: string]: { name: string, symbol: string } } = {
    '1': { name: 'Bitcoin', symbol: 'BTC' },
    '2': { name: 'Ethereum', symbol: 'ETH' },
    '3': { name: 'Cardano', symbol: 'ADA' }
  };

  const fetchTransactions = async () => {
    try {
      const transactionsRef = collection(FIREBASE_DB, 'transactions');
      const querySnapshot = await getDocs(transactionsRef);
      
      const transactionsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        const cryptoId = data.id_crypto.toString();
        const cryptoInfo = cryptoNames[cryptoId] || { name: 'Crypto inconnue', symbol: '???' };
        
        return {
          id: docSnapshot.id,
          ...data,
          date_heure: data.date_heure.toDate(),
          cryptoName: cryptoInfo.name,
          cryptoSymbol: cryptoInfo.symbol,
          userEmail: data.idUtilisateur
        } as Transaction;
      });

      const loadedTransactions = await Promise.all(transactionsPromises);
      loadedTransactions.sort((a, b) => b.date_heure.getTime() - a.date_heure.getTime());
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      // Requête simplifiée sans orderBy pour éviter le besoin d'un index composite
      const notificationsQuery = query(
        collection(FIREBASE_DB, 'notifications'),
        where('status', '==', 'en_attente')
      );

      const notificationsSnapshot = await getDocs(notificationsQuery);
      const notificationsData = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date_creation: doc.data().date_creation?.toDate()
      })) as Notification[];

      // Tri côté client
      notificationsData.sort((a, b) => {
        if (!a.date_creation || !b.date_creation) return 0;
        return b.date_creation.getTime() - a.date_creation.getTime();
      });

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      Alert.alert(
        'Erreur',
        'Impossible de récupérer les notifications. Veuillez réessayer.'
      );
    }
  };

  const handleValidateTransaction = async (notification: Notification, isApproved: boolean) => {
    try {
      // Mettre à jour la notification
      const notificationRef = firestoreDoc(FIREBASE_DB, 'notifications', notification.id);
      await updateDoc(notificationRef, {
        status: isApproved ? 'validee' : 'refusee',
        date_validation: serverTimestamp()
      });

      if (isApproved) {
        // Trouver l'ID de l'utilisateur à partir de son email
        const usersRef = collection(FIREBASE_DB, 'utilisateurs');
        const q = query(usersRef, where('email', '==', notification.userEmail));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          Alert.alert('Erreur', 'Utilisateur non trouvé');
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userRef = firestoreDoc(FIREBASE_DB, 'utilisateurs', userDoc.id);

        // Convertir les montants en nombres
        const currentBalance = Number(userData.porteFeuille || 0);
        const montantOperation = Number(notification.montant);
        const newBalance = notification.type === 'depot' 
          ? currentBalance + montantOperation
          : currentBalance - montantOperation;

        console.log('Calcul du solde:', {
          currentBalance,
          montantOperation,
          newBalance,
          type: notification.type
        });

        if (notification.type === 'retrait' && newBalance < 0) {
          Alert.alert('Erreur', 'Le solde de l\'utilisateur serait négatif après cette opération');
          return;
        }

        // Mettre à jour le solde
        await updateDoc(userRef, {
          porteFeuille: newBalance
        });

        // Créer une transaction dans l'historique
        await addDoc(collection(FIREBASE_DB, 'historiquedepot'), {
          utilisateur: userDoc.id,
          valeur: montantOperation,
          dateheure: serverTimestamp(),
          is_depot: notification.type === 'depot'
        });

        console.log('Mise à jour du solde réussie:', {
          userId: userDoc.id,
          oldBalance: currentBalance,
          newBalance: newBalance,
          amount: montantOperation,
          type: notification.type
        });
      }

      // Rafraîchir les données
      fetchData();
      Alert.alert(
        'Succès',
        `La demande a été ${isApproved ? 'validée' : 'refusée'} avec succès`
      );
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la validation');
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.email}</Text>
        <Text style={[styles.badge, { backgroundColor: item.role === 'admin' ? '#3498db' : '#2ecc71' }]}>
          {item.role || 'user'}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.balanceLabel}>Solde:</Text>
        <Text style={styles.balanceValue}>${item.porteFeuille?.toLocaleString() || '0'}</Text>
      </View>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.transactionType, { color: item.is_achat ? '#2ecc71' : '#e74c3c' }]}>
          {item.is_achat ? 'ACHAT' : 'VENTE'}
        </Text>
        <Text style={styles.date}>
          {item.date_heure.toLocaleDateString()} {item.date_heure.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.cryptoName}>{item.cryptoName}</Text>
          <Text style={styles.cryptoSymbol}>{item.cryptoSymbol}</Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.amount}>{item.valeur} {item.cryptoSymbol}</Text>
          <Text style={styles.userEmail}>Par: {item.userEmail}</Text>
        </View>
      </View>
    </View>
  );

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
          <Ionicons 
            name={item.type === 'depot' ? 'arrow-down-circle' : 'arrow-up-circle'} 
            size={24} 
            color={item.type === 'depot' ? '#2ecc71' : '#e74c3c'} 
          />
          <Text style={[styles.transactionType, { 
            color: item.type === 'depot' ? '#2ecc71' : '#e74c3c',
            marginLeft: 8
          }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.date}>
          {item.date_creation.toLocaleDateString()} {item.date_creation.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <Text style={styles.amount}>Montant: ${item.montant}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleValidateTransaction(item, true)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Valider</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleValidateTransaction(item, false)}
          >
            <Ionicons name="close-circle-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administration</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons 
            name="notifications-outline" 
            size={24} 
            color={activeTab === 'notifications' ? '#2c3e50' : '#7f8c8d'}
          />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons 
            name="people-outline" 
            size={24} 
            color={activeTab === 'users' ? '#2c3e50' : '#7f8c8d'}
          />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Utilisateurs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Ionicons 
            name="swap-horizontal-outline" 
            size={24} 
            color={activeTab === 'transactions' ? '#2c3e50' : '#7f8c8d'}
          />
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notifications' ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune notification en attente</Text>
            </View>
          }
        />
      ) : activeTab === 'users' ? (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2c3e50',
  },
  tabText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#7f8c8d',
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
  transactionDetails: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default Admin;
