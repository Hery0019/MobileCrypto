import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { collection, doc as firestoreDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_DB } from '../../FirebaseConfig';
import { Tab, TabView } from '@rneui/themed';

interface Notification {
  id: string;
  userEmail: string;
  userName: string;
  amount: number;
  type: 'depot' | 'retrait';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

const Admin = () => {
  const [index, setIndex] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const notificationsRef = collection(FIREBASE_DB, 'notifications');
      const q = query(notificationsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const notifs: Notification[] = [];
      querySnapshot.forEach((doc) => {
        notifs.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });
      
      setNotifications(notifs);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
      setLoading(false);
    }
  };

  const handleNotificationAction = async (notification: Notification, isApproved: boolean) => {
    try {
      console.log('Traitement de la notification:', notification);

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
      console.log('Solde actuel:', currentBalance);
      
      if (isApproved) {
        const newBalance = notification.type === 'depot' 
          ? currentBalance + notification.amount 
          : currentBalance - notification.amount;

        console.log('Nouveau solde:', newBalance);

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

  const renderNotification = (notification: Notification) => (
    <View key={notification.id} style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>
          Demande de {notification.type === 'depot' ? 'dépôt' : 'retrait'}
        </Text>
        <Text style={styles.notificationAmount}>{notification.amount} Ar</Text>
      </View>
      
      <Text style={styles.notificationText}>De: {notification.userName || notification.userEmail}</Text>
      <Text style={styles.notificationText}>Email: {notification.userEmail}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleNotificationAction(notification, true)}
        >
          <Text style={styles.buttonText}>Approuver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleNotificationAction(notification, false)}
        >
          <Text style={styles.buttonText}>Rejeter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Tab
        value={index}
        onChange={setIndex}
        indicatorStyle={{ backgroundColor: '#2089dc' }}
      >
        <Tab.Item title="Notifications" />
        <Tab.Item title="Utilisateurs" />
        <Tab.Item title="Transactions" />
      </Tab>

      <TabView value={index} onChange={setIndex} animationType="spring">
        <TabView.Item style={styles.tabContent}>
          <ScrollView style={styles.scrollView}>
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
            ) : notifications.length > 0 ? (
              notifications.map(renderNotification)
            ) : (
              <Text style={styles.emptyText}>Aucune notification en attente</Text>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabContent}>
          <Text>Liste des utilisateurs à implémenter</Text>
        </TabView.Item>

        <TabView.Item style={styles.tabContent}>
          <Text>Historique des transactions à implémenter</Text>
        </TabView.Item>
      </TabView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  tabContent: {
    width: '100%',
  },
  loader: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2089dc',
  },
  notificationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default Admin;
