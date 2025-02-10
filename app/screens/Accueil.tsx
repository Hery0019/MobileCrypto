import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, SafeAreaView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { FIREBASE_DB } from '../../FirebaseConfig';

interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  priceHistory: number[];
}

const chartWidth = Dimensions.get('window').width - 40;

const Accueil = () => {
  const [cryptocurrencies, setCryptocurrencies] = useState<Cryptocurrency[]>([]);

  const fetchAndUpdateCryptos = async () => {
    try {
      const cryptosRef = collection(FIREBASE_DB, 'cryptocurrencies');
      const querySnapshot = await getDocs(cryptosRef);
      const cryptos: Cryptocurrency[] = [];

      for (const docSnapshot of querySnapshot.docs) {
        const crypto = docSnapshot.data() as Cryptocurrency;
        
        const changePercent = (Math.random() * 10) - 5;
        const priceChange = crypto.price * (changePercent / 100);
        const newPrice = crypto.price + priceChange;
        
        const newHistory = [...(crypto.priceHistory || []), newPrice].slice(-10);
        
        await updateDoc(doc(cryptosRef, docSnapshot.id), {
          price: newPrice,
          change24h: changePercent,
          priceHistory: newHistory
        });

        cryptos.push({
          id: docSnapshot.id,
          ...crypto,
          price: newPrice,
          change24h: changePercent,
          priceHistory: newHistory
        });
      }

      setCryptocurrencies(cryptos);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des cryptos:', error);
    }
  };

  useEffect(() => {
    fetchAndUpdateCryptos();
    const interval = setInterval(fetchAndUpdateCryptos, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartDatasets = cryptocurrencies.map((crypto, index) => ({
    data: crypto.priceHistory || [],
    color: () => {
      switch (crypto.symbol) {
        case 'BTC':
          return 'rgba(255, 193, 7, 1)'; // Jaune
        case 'ETH':
          return 'rgba(46, 204, 113, 1)'; // Vert
        case 'ADA':
          return 'rgba(231, 76, 60, 1)'; // Rouge
        default:
          return `rgba(${index * 50}, ${100 + index * 50}, ${255 - index * 50}, 1)`;
      }
    },
    strokeWidth: 2,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Marché des Cryptomonnaies</Text>
        
        <View style={styles.cryptoList}>
          <FlatList
            data={cryptocurrencies}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.cryptoItem}>
                <View style={styles.cryptoInfo}>
                  <Text style={[
                    styles.cryptoName,
                    { 
                      color: item.symbol === 'BTC' 
                        ? '#ffc107' 
                        : item.symbol === 'ETH'
                        ? '#2ecc71'
                        : '#e74c3c'
                    }
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.cryptoSymbol}>{item.symbol}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.cryptoPrice}>
                    ${item.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Text>
                  <Text style={[
                    styles.cryptoChange,
                    { color: item.change24h >= 0 ? '#2ecc71' : '#e74c3c' }
                  ]}>
                    {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
        
        <Text style={styles.chartTitle}>Évolution des Prix</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: Array.from({ length: 10 }, (_, i) => ''),
              datasets: chartDatasets,
            }}
            width={chartWidth}
            height={220}
            yAxisLabel="$"
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              propsForLabels: {
                fontSize: 10,
              },
              propsForBackgroundLines: {
                strokeWidth: 1,
                strokeDasharray: null,
                stroke: "#e3e3e3",
              },
            }}
            bezier
            style={styles.chart}
            withDots={false}
            withInnerLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  cryptoList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cryptoInfo: {
    flexDirection: 'column',
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cryptoSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  cryptoPrice: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  cryptoChange: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 5,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default Accueil;
