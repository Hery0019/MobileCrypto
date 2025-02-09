import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get("window").width;

const generateRandomPrice = (basePrice: number) => {
  const variation = (Math.random() * 2 - 1) * 0.05 * basePrice; // Variation de ±5%
  return parseFloat((basePrice + variation).toFixed(2));
};

const Accueil = ({ navigation }: { navigation: any }) => {
  const [cryptoData, setCryptoData] = useState([
    { id: '1', name: 'Bitcoin', price: generateRandomPrice(6000), history: [6000] },
    { id: '2', name: 'Ethereum', price: generateRandomPrice(4000), history: [4000] },
    { id: '3', name: 'Cardano', price: generateRandomPrice(5000), history: [5000] },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCryptoData((prevData) =>
        prevData.map((crypto) => {
          const newPrice = generateRandomPrice(crypto.price);
          return {
            ...crypto,
            price: newPrice,
            history: [...crypto.history.slice(-9), newPrice], // Stocker les 10 dernières valeurs
          };
        })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartDatasets = cryptoData.map((crypto, index) => ({
    data: crypto.history,
    color: () => `rgba(${index * 50}, ${100 + index * 50}, ${255 - index * 50}, 1)`, // Couleur différente pour chaque crypto
    strokeWidth: 2,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Cours des Cryptomonnaies</Text>
      <FlatList
        data={cryptoData}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={[styles.text, { color: `rgba(${index * 50}, ${100 + index * 50}, ${255 - index * 50}, 1)` }]}>
              {item.name}
            </Text>
            <Text style={styles.text}>{item.price} USD</Text>
          </View>
        )}
      />
      <Text style={styles.chartTitle}>Évolution des Prix</Text>
      <LineChart
        data={{
          labels: Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
          datasets: chartDatasets,
        }}
        width={screenWidth - 40}  // Ajuster la taille du graphique
        height={400}  // Augmenter la hauteur du graphique
        yAxisLabel="$"
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#f3f3f3",
          backgroundGradientTo: "#f3f3f3",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  text: {
    fontSize: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  chart: {
    marginVertical: 10,
    borderRadius: 10,
  },
});

export default Accueil;
