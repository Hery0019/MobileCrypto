import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get("window").width;

const generateRandomPrice = (basePrice: number) => {
  const variation = (Math.random() * 2 - 1) * 0.05 * basePrice;
  return parseFloat((basePrice + variation).toFixed(2));
};

const Accueil = ({ navigation }: { navigation: any }) => {
  const [cryptoData, setCryptoData] = useState([
    { id: '1', name: 'Bitcoin', price: generateRandomPrice(6000), history: [6000] },
    { id: '2', name: 'Ethereum', price: generateRandomPrice(4000), history: [4000] },
    { id: '3', name: 'Cardano', price: generateRandomPrice(5000), history: [5000] },
  ]);

  const { width } = Dimensions.get('window');
  const chartWidth = Math.min(width - 40, 600);

  useEffect(() => {
    const interval = setInterval(() => {
      setCryptoData((prevData) =>
        prevData.map((crypto) => {
          const newPrice = generateRandomPrice(crypto.price);
          return {
            ...crypto,
            price: newPrice,
            history: [...crypto.history.slice(-9), newPrice],
          };
        })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartDatasets = cryptoData.map((crypto, index) => ({
    data: crypto.history,
    color: () => `rgba(${index * 50}, ${100 + index * 50}, ${255 - index * 50}, 1)`,
    strokeWidth: 2,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Cours des Cryptomonnaies</Text>
        <View style={styles.cryptoList}>
          <FlatList
            data={cryptoData}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.cryptoItem}>
                <Text style={[
                  styles.cryptoName,
                  { color: `rgba(${index * 50}, ${100 + index * 50}, ${255 - index * 50}, 1)` }
                ]}>
                  {item.name}
                </Text>
                <Text style={styles.cryptoPrice}>{item.price.toLocaleString()} USD</Text>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
        
        <Text style={styles.chartTitle}>Évolution des Prix</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
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
            }}
            bezier
            style={styles.chart}
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
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cryptoPrice: {
    fontSize: 16,
    color: '#2c3e50',
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
