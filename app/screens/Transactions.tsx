import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { subscribeCryptos, subscribeUserTransactions, subscribeWallets } from '../services/firestore';
import { functionsErrorMessage, placeOrder } from '../services/functions';
import { Crypto, Transaction, Wallet } from '../services/model';

const TRANSACTIONS_LIMIT = 50;
const QUANTITY_DECIMALS = 4;

const formatMoney = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function Transactions() {
  const { user } = useAuth();
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [wallets, setWallets] = useState<Record<string, Wallet>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'achat' | 'vente'>('achat');
  const [selectedCryptoId, setSelectedCryptoId] = useState<string>('');
  const [quantity, setQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const uid = user?.uid;
  const balance = user?.porteFeuille ?? 0;

  useEffect(() => {
    if (!uid) {
      return undefined;
    }
    const onError = (error: Error) => {
      console.error('Chargement des données de transaction impossible:', error);
      setLoadError('Impossible de charger les données. Vérifiez votre connexion.');
    };
    const unsubscribes = [
      subscribeCryptos(setCryptos, onError),
      subscribeWallets(uid, setWallets, onError),
      subscribeUserTransactions(uid, TRANSACTIONS_LIMIT, setTransactions, onError),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  // Sélection par défaut : première crypto disponible.
  useEffect(() => {
    if (!selectedCryptoId && cryptos.length > 0) {
      setSelectedCryptoId(cryptos[0].id);
    }
  }, [cryptos, selectedCryptoId]);

  const selectedCrypto = useMemo(() => cryptos.find((c) => c.id === selectedCryptoId) ?? null, [cryptos, selectedCryptoId]);
  const cryptoBalance = selectedCrypto ? wallets[selectedCrypto.id]?.valeur ?? 0 : 0;

  const maxQuantity = useMemo(() => {
    if (!selectedCrypto) {
      return 0;
    }
    if (selectedType === 'achat') {
      return selectedCrypto.price > 0 ? Math.floor((balance / selectedCrypto.price) * 10 ** QUANTITY_DECIMALS) / 10 ** QUANTITY_DECIMALS : 0;
    }
    return cryptoBalance;
  }, [selectedCrypto, selectedType, balance, cryptoBalance]);

  const estimatedTotal = selectedCrypto ? quantity * selectedCrypto.price : 0;

  const resetForm = () => setQuantity(0);

  const submitOrder = async () => {
    if (!selectedCrypto || quantity <= 0 || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      // Le serveur relit le prix et les soldes dans une transaction ; le
      // total affiché ici n'est qu'une estimation.
      const result = await placeOrder({ type: selectedType, cryptoId: selectedCrypto.id, quantite: quantity });
      setModalVisible(false);
      resetForm();
      Alert.alert(
        'Transaction effectuée',
        `${selectedType === 'achat' ? 'Achat' : 'Vente'} de ${quantity} ${selectedCrypto.symbol} à ${formatMoney(result.prixUnitaire)}\n` +
          `Total : ${formatMoney(result.montantTotal)}\nNouveau solde : ${formatMoney(result.nouveauSoldeFiat)}`
      );
    } catch (error) {
      console.error('Ordre refusé:', error);
      Alert.alert('Transaction refusée', functionsErrorMessage(error, 'Une erreur est survenue. Réessayez.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionTypeContainer}>
          <Text style={[styles.transactionType, { color: item.is_achat ? '#4CAF50' : '#F44336' }]}>
            {item.is_achat ? 'Achat' : 'Vente'}
          </Text>
          <Text style={styles.cryptoName}>{item.cryptoName}</Text>
        </View>
        <Text style={styles.transactionDate}>
          {item.date_heure.toLocaleDateString()} {item.date_heure.toLocaleTimeString()}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantité :</Text>
          <Text style={styles.detailValue}>{item.valeur.toFixed(QUANTITY_DECIMALS)} {item.cryptoSymbol}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Prix unitaire :</Text>
          <Text style={styles.detailValue}>{formatMoney(item.prix_unitaire)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total :</Text>
          <Text style={styles.detailValue}>{formatMoney(item.montant_total)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)} disabled={cryptos.length === 0}>
        <Text style={styles.addButtonText}>Nouvelle Transaction</Text>
      </TouchableOpacity>

      {loadError && <Text style={styles.errorText}>{loadError}</Text>}

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        style={styles.transactionList}
        ListEmptyComponent={() => (
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>{loadError ? '' : 'Aucune transaction'}</Text>
          </View>
        )}
      />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedType === 'achat' ? 'Acheter' : 'Vendre'} une crypto-monnaie</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)} disabled={submitting}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              {(['achat', 'vente'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, selectedType === type && styles.selectedButton]}
                  onPress={() => { setSelectedType(type); resetForm(); }}
                  disabled={submitting}
                >
                  <Text style={[styles.typeButtonText, selectedType === type && styles.selectedButtonText]}>
                    {type === 'achat' ? 'Acheter' : 'Vendre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.balanceText}>
              {selectedType === 'achat'
                ? `Solde disponible : ${formatMoney(balance)}`
                : selectedCrypto
                  ? `Solde disponible : ${cryptoBalance.toFixed(QUANTITY_DECIMALS)} ${selectedCrypto.symbol}`
                  : 'Sélectionnez une crypto-monnaie'}
            </Text>

            <Text style={styles.inputLabel}>Crypto-monnaie</Text>
            <View style={styles.picker}>
              <Picker
                selectedValue={selectedCryptoId}
                onValueChange={(value: string) => { setSelectedCryptoId(value); resetForm(); }}
                style={styles.pickerStyle}
                mode="dropdown"
                enabled={!submitting}
              >
                {cryptos.map((crypto) => (
                  <Picker.Item
                    key={crypto.id}
                    label={`${crypto.name} (${formatMoney(crypto.price)}) — détenu : ${(wallets[crypto.id]?.valeur ?? 0).toFixed(QUANTITY_DECIMALS)}`}
                    value={crypto.id}
                  />
                ))}
              </Picker>
            </View>

            {selectedCrypto && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  Quantité à {selectedType === 'achat' ? 'acheter' : 'vendre'} (max : {maxQuantity.toFixed(QUANTITY_DECIMALS)} {selectedCrypto.symbol})
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={maxQuantity}
                  value={quantity}
                  onValueChange={(value: number) => setQuantity(Number(value.toFixed(QUANTITY_DECIMALS)))}
                  minimumTrackTintColor="#2ecc71"
                  maximumTrackTintColor="#bdc3c7"
                  disabled={submitting || maxQuantity <= 0}
                />
                <Text style={styles.amountText}>{quantity.toFixed(QUANTITY_DECIMALS)} {selectedCrypto.symbol}</Text>
                <Text style={styles.totalText}>Total estimé : {formatMoney(estimatedTotal)} (au cours actuel)</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, (quantity <= 0 || submitting) && styles.disabledButton]}
              onPress={submitOrder}
              disabled={quantity <= 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{selectedType === 'achat' ? 'Acheter' : 'Vendre'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  addButton: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 5, alignItems: 'center', width: '100%', marginBottom: 20 },
  addButtonText: { color: 'white', fontWeight: '500' },
  errorText: { color: '#e74c3c', textAlign: 'center', marginBottom: 10 },
  transactionList: { padding: 15 },
  transactionItem: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginVertical: 8, elevation: 2 },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  transactionTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  transactionType: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  cryptoName: { fontSize: 16, color: '#666' },
  transactionDate: { fontSize: 14, color: '#666' },
  transactionDetails: { backgroundColor: '#f8f9fa', borderRadius: 4, padding: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#333' },
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 16, color: '#666' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', flex: 1 },
  closeButton: { padding: 10 },
  closeButtonText: { fontSize: 24, color: '#2c3e50' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  typeButton: { backgroundColor: '#f5f6fa', padding: 10, borderRadius: 5, alignItems: 'center', width: '45%', borderColor: '#2c3e50', borderWidth: 1 },
  selectedButton: { backgroundColor: '#2c3e50' },
  typeButtonText: { fontSize: 16, color: '#2c3e50' },
  selectedButtonText: { color: '#fff' },
  balanceText: { fontSize: 16, color: '#2c3e50', marginBottom: 20 },
  picker: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 5, marginTop: 5, marginBottom: 20, backgroundColor: '#fff', overflow: 'hidden' },
  pickerStyle: { height: 50, width: '100%', color: '#2c3e50' },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#7f8c8d', marginBottom: 5 },
  slider: { width: '100%', height: 40 },
  amountText: { textAlign: 'center', fontSize: 18, color: '#2c3e50', fontWeight: '500', marginTop: 10 },
  totalText: { fontSize: 14, color: '#7f8c8d', textAlign: 'center' },
  submitButton: { padding: 12, borderRadius: 5, alignItems: 'center', width: '100%', backgroundColor: '#2ecc71' },
  disabledButton: { backgroundColor: '#bdc3c7' },
  submitButtonText: { color: 'white', fontWeight: '500' },
});
