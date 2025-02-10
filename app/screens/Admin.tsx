import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { collection, getDocs, getDoc, doc as firestoreDoc, updateDoc, serverTimestamp, query, where, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

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
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'notifications'>('notifications');
  const { setUser } = useAuth();
  const navigation = useNavigation();

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

  const fetchNotifications = async () => {
    try {
      const notificationsRef = collection(FIREBASE_DB, 'notifications');
      const q = query(notificationsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Notification[];

      notificationsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    }
  };

  const handleNotificationAction = async (notification: Notification, isApproved: boolean) => {
    try {
      console.log('Traitement de la notification:', notification); // Log pour déboguer

      const notificationRef = firestoreDoc(FIREBASE_DB, 'notifications', notification.id);
      
      // Trouver l'utilisateur par email
      const usersRef = collection(FIREBASE_DB, 'utilisateurs');
      const q = query(usersRef, where('email', '==', notification.userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error('Utilisateur non trouvé:', notification.userEmail);
        Alert.alert('Erreur', 'Utilisateur non trouvé');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const currentBalance = userData.porteFeuille || 0;
      console.log('Solde actuel:', currentBalance); // Log pour déboguer
      
      if (isApproved) {
        const newBalance = notification.type === 'depot' 
          ? currentBalance + notification.amount 
          : currentBalance - notification.amount;

        console.log('Nouveau solde:', newBalance); // Log pour déboguer

        // Mettre à jour le solde de l'utilisateur
        await updateDoc(userDoc.ref, {
          porteFeuille: newBalance
        });

        // Ajouter l'historique de la transaction
        await addDoc(collection(FIREBASE_DB, 'historiquedepot'), {
          utilisateur: userDoc.ref,
          valeur: notification.amount,
          dateheure: serverTimestamp(),
          is_depot: notification.type === 'depot'
        });
      }

      // Mettre à jour le statut de la notification
      await updateDoc(notificationRef, {
        status: isApproved ? 'approved' : 'rejected',
        processedAt: serverTimestamp()
      });

      // Rafraîchir les notifications
      fetchNotifications();
      
      Alert.alert(
        'Succès',
        `La demande a été ${isApproved ? 'approuvée' : 'rejetée'} avec succès`
      );
    } catch (error) {
      console.error('Erreur lors du traitement de la notification:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du traitement de la demande');
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

  const fetchTransactions = async () => {
    try {
      const transactionsRef = collection(FIREBASE_DB, 'transactions');
      const querySnapshot = await getDocs(transactionsRef);
      
      const transactionsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Récupérer les détails de la crypto
        const cryptoRef = firestoreDoc(FIREBASE_DB, 'cryptocurrencies', data.id_crypto);
        const cryptoDoc = await getDoc(cryptoRef);
        const cryptoData = cryptoDoc.data();

        return {
          id: docSnapshot.id,
          ...data,
          date_heure: data.date_heure.toDate(),
          cryptoName: cryptoData?.name || 'Crypto inconnue',
          cryptoSymbol: cryptoData?.symbol || '???',
          userEmail: data.idUtilisateur
        } as Transaction;
      });

      const loadedTransactions = await Promise.all(transactionsPromises);
      // Trier par date, plus récent en premier
      loadedTransactions.sort((a, b) => b.date_heure.getTime() - a.date_heure.getTime());
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTransactions();
    fetchNotifications();
  }, []);

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.email}</Text>
        <Text style={styles.cardSubtitle}>Role: {item.role || 'user'}</Text>
      </View>
      <Text style={styles.cardValue}>
        Solde: ${item.porteFeuille?.toLocaleString() || '0'}
      </Text>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[
          styles.transactionType,
          { color: item.is_achat ? '#2ecc71' : '#e74c3c' }
        ]}>
          {item.is_achat ? 'ACHAT' : 'VENTE'}
        </Text>
        <Text style={styles.date}>
          {item.date_heure.toLocaleDateString()} {item.date_heure.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <View>
          <Text style={styles.cardTitle}>{item.cryptoName}</Text>
          <Text style={styles.cardSubtitle}>{item.cryptoSymbol}</Text>
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
        <Text style={[
          styles.transactionType,
          { color: item.type === 'depot' ? '#2ecc71' : '#e74c3c' }
        ]}>
          {item.type === 'depot' ? 'DÉPÔT' : 'RETRAIT'}
        </Text>
        <Text style={styles.date}>
          {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <View>
          <Text style={styles.cardTitle}>{item.userEmail}</Text>
          <Text style={styles.amount}>{item.amount} $</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleNotificationAction(item, true)}
          >
            <Text style={styles.actionButtonText}>Approuver</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleNotificationAction(item, false)}
          >
            <Text style={styles.actionButtonText}>Rejeter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Administration</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
            Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Utilisateurs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  cardValue: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: '500',
  },
  transactionType: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  date: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default Admin;
