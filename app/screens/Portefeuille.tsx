import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CryptoAsset {
  id: string;
  name: string;
  symbol: string;
  amount: number;
  value: number;
  change24h: number;
}

const Portefeuille = () => {
  const [assets] = useState<CryptoAsset[]>([
    {
      id: '1',
      name: 'Bitcoin',
      symbol: 'BTC',
      amount: 0.5,
      value: 23000,
      change24h: 2.5,
    },
    {
      id: '2',
      name: 'Ethereum',
      symbol: 'ETH',
      amount: 2.3,
      value: 1800,
      change24h: -1.2,
    },
    {
      id: '3',
      name: 'Cardano',
      symbol: 'ADA',
      amount: 1000,
      value: 0.5,
      change24h: 5.7,
    },
  ]);

  const getTotalValue = () => {
    return assets.reduce((total, asset) => total + (asset.amount * asset.value), 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon Portefeuille</Text>
        <View style={styles.totalValue}>
          <Text style={styles.totalValueLabel}>Valeur Totale</Text>
          <Text style={styles.totalValueAmount}>${getTotalValue().toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView style={styles.assetList}>
        {assets.map((asset) => (
          <TouchableOpacity key={asset.id} style={styles.assetCard}>
            <View style={styles.assetInfo}>
              <Text style={styles.assetName}>{asset.name}</Text>
              <Text style={styles.assetSymbol}>{asset.symbol}</Text>
            </View>
            
            <View style={styles.assetValues}>
              <Text style={styles.assetAmount}>
                {asset.amount} {asset.symbol}
              </Text>
              <Text style={styles.assetValue}>
                ${(asset.amount * asset.value).toLocaleString()}
              </Text>
              <Text style={[
                styles.assetChange,
                { color: asset.change24h >= 0 ? '#2ecc71' : '#e74c3c' }
              ]}>
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter une crypto-monnaie</Text>
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
    marginBottom: 10,
  },
  totalValue: {
    backgroundColor: '#2c3e50',
    padding: 20,
    borderRadius: 10,
  },
  totalValueLabel: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  totalValueAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  assetList: {
    flex: 1,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  assetSymbol: {
    color: '#666',
    marginTop: 4,
  },
  assetValues: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  assetValue: {
    fontSize: 16,
    color: '#2c3e50',
    marginTop: 4,
  },
  assetChange: {
    fontSize: 14,
    marginTop: 4,
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

export default Portefeuille;
