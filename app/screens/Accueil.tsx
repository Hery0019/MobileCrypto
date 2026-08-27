import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { subscribeCryptos } from '../services/firestore';
import { Crypto } from '../services/model';

const CHART_POINTS = 10;
const seriesColor = (index: number) => `rgba(${index * 50}, ${100 + index * 50}, ${255 - index * 50}, 1)`;

const Accueil = () => {
  const [cryptos, setCryptos] = useState<Crypto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { width } = Dimensions.get('window');
  const chartWidth = Math.min(width - 40, 600);

  // Cours réels (cryptocurrencies/{id}.price), mis à jour par le serveur :
  // ce sont les prix auxquels les ordres sont exécutés.
  useEffect(
    () =>
      subscribeCryptos(
        (list) => { setCryptos(list); setError(null); },
        (e) => { console.error('Abonnement aux cours impossible:', e); setError('Cours indisponibles. Vérifiez votre connexion.'); }
      ),
    []
  );

  const chart = useMemo(() => {
    if (!cryptos || cryptos.length === 0) {
      return null;
    }
    const datasets = cryptos.map((crypto, index) => {
      const points = (crypto.history.length ? crypto.history.map((p) => p.price) : [crypto.price]).slice(-CHART_POINTS);
      // chart-kit attend des séries de même longueur : on complète à gauche.
      const padded = [...Array(Math.max(0, CHART_POINTS - points.length)).fill(points[0]), ...points];
      return { data: padded, color: () => seriesColor(index), strokeWidth: 2 };
    });
    return { labels: Array.from({ length: CHART_POINTS }, (_, i) => (i + 1).toString()), datasets };
  }, [cryptos]);

  const updatedAt = useMemo(() => {
    const last = cryptos?.flatMap((c) => c.history.slice(-1)).sort((a, b) => b.at.getTime() - a.at.getTime())[0];
    return last ? last.at.toLocaleTimeString() : null;
  }, [cryptos]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Cours des Cryptomonnaies</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {cryptos === null ? (
          <ActivityIndicator size="large" color="#2c3e50" style={styles.loading} />
        ) : (
          <>
            <View style={styles.cryptoList}>
              <FlatList
                data={cryptos}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View style={styles.cryptoItem}>
                    <Text style={[styles.cryptoName, { color: seriesColor(index) }]}>{item.name} ({item.symbol})</Text>
                    <Text style={styles.cryptoPrice}>{item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.muted}>Aucune crypto-monnaie disponible</Text>}
              />
              {updatedAt && <Text style={styles.muted}>Mis à jour à {updatedAt}</Text>}
            </View>

            {chart && (
              <>
                <Text style={styles.chartTitle}>Évolution des Prix</Text>
                <View style={styles.chartContainer}>
                  <LineChart
                    data={chart}
                    width={chartWidth}
                    height={220}
                    yAxisLabel="$"
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 2,
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      propsForLabels: { fontSize: 10 },
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              </>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  errorText: { color: '#e74c3c', textAlign: 'center', marginBottom: 10 },
  loading: { marginTop: 40 },
  cryptoList: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 15, marginBottom: 20, elevation: 2 },
  cryptoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cryptoName: { fontSize: 16, fontWeight: '600' },
  cryptoPrice: { fontSize: 16, color: '#2c3e50' },
  muted: { fontSize: 12, color: '#7f8c8d', textAlign: 'right', marginTop: 8 },
  chartTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  chartContainer: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 10, elevation: 2 },
  chart: { marginVertical: 8, borderRadius: 16 },
});

export default Accueil;
