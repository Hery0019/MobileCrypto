import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
  id: string;
  type: 'achat' | 'vente';
  cryptoName: string;
  cryptoSymbol: string;
  amount: number;
  price: number;
  date: Date;
}

const Transactions = () => {
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'achat',
      cryptoName: 'Bitcoin',
      cryptoSymbol: 'BTC',
      amount: 0.1,
      price: 45000,
      date: new Date('2024-02-09T10:30:00'),
    },
    {
      id: '2',
      type: 'vente',
      cryptoName: 'Ethereum',
      cryptoSymbol: 'ETH',
      amount: 1.5,
      price: 2800,
      date: new Date('2024-02-08T15:45:00'),
    },
  ]);

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isAchat = item.type === 'achat';
    const totalValue = item.amount * item.price;

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.cryptoInfo}>
            <Ionicons 
              name={isAchat ? 'arrow-down-circle' : 'arrow-up-circle'} 
              size={24} 
              color={isAchat ? '#2ecc71' : '#e74c3c'} 
            />
            <Text style={styles.cryptoName}>{item.cryptoName}</Text>
            <Text style={styles.cryptoSymbol}>({item.cryptoSymbol})</Text>
          </View>
          <Text style={styles.date}>
            {item.date.toLocaleDateString()} {item.date.toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={[
              styles.detailValue,
              { color: isAchat ? '#2ecc71' : '#e74c3c' }
            ]}>
              {isAchat ? 'Achat' : 'Vente'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Montant:</Text>
            <Text style={styles.detailValue}>{item.amount} {item.cryptoSymbol}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prix:</Text>
            <Text style={styles.detailValue}>${item.price.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.detailValue}>${totalValue.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique des Transactions</Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.transactionList}
      />

      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Nouvelle Transaction</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  transactionList: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cryptoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cryptoName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  cryptoSymbol: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  date: {
    color: '#666',
    fontSize: 14,
  },
  transactionDetails: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    color: '#666',
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default Transactions;
