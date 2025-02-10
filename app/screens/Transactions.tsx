import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';

interface Transaction {
  id: string;
  valeur: number;
  is_depot: boolean;
  dateheure: any;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (!user?.email) {
        console.error('Utilisateur non connecté');
        return;
      }

      const userRef = doc(FIREBASE_DB, 'utilisateurs', user.email);
      const transactionsQuery = query(
        collection(FIREBASE_DB, 'historiquedepot'),
        where('utilisateur', '==', userRef)
      );

      const querySnapshot = await getDocs(transactionsQuery);
      const transactionsList: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactionsList.push({
          id: doc.id,
          valeur: data.valeur,
          is_depot: data.is_depot,
          dateheure: data.dateheure,
        });
      });

      // Trier par date décroissante
      transactionsList.sort((a, b) => b.dateheure.seconds - a.dateheure.seconds);

      setTransactions(transactionsList);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      setLoading(false);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const date = new Date(item.dateheure.seconds * 1000);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <Text style={[
            styles.transactionType,
            { color: item.is_depot ? '#4CAF50' : '#f44336' }
          ]}>
            {item.is_depot ? 'Dépôt' : 'Retrait'}
          </Text>
          <Text style={styles.transactionAmount}>
            {item.is_depot ? '+' : '-'}{item.valeur} Ar
          </Text>
        </View>
        <View style={styles.transactionFooter}>
          <Text style={styles.transactionDate}>{formattedDate}</Text>
          <Text style={styles.transactionTime}>{formattedTime}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique des Transactions</Text>
      {transactions.length > 0 ? (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <Text style={styles.emptyText}>Aucune transaction trouvée</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  transactionDate: {
    color: '#666',
    fontSize: 14,
  },
  transactionTime: {
    color: '#666',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});

export default Transactions;
