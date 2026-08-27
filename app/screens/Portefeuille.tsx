import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchUserCashHistory, subscribeCryptos, subscribeUserCashRequests, subscribeWallets } from '../services/firestore';
import { functionsErrorMessage, requestCashMovement } from '../services/functions';
import { CashHistoryEntry, CashMovementType, CashRequest, Crypto, Wallet } from '../services/model';

const HISTORY_LIMIT = 50;
const REQUESTS_LIMIT = 20;

const formatMoney = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatDateTime = (date: Date | null) => (date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : '—');

const STATUS_LABEL: Record<CashRequest['status'], string> = {
  en_attente: 'En attente',
  validee: 'Validée',
  refusee: 'Refusée',
};

const Portefeuille = () => {
  const { user } = useAuth();
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [wallets, setWallets] = useState<Record<string, Wallet>>({});
  const [requests, setRequests] = useState<CashRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [movementType, setMovementType] = useState<CashMovementType | null>(null);
  const [montant, setMontant] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<CashHistoryEntry[] | null>(null);

  const uid = user?.uid;
  const solde = user?.porteFeuille ?? 0;

  useEffect(() => {
    if (!uid) {
      return undefined;
    }
    const onError = (error: Error) => {
      console.error('Chargement du portefeuille impossible:', error);
      setLoadError('Impossible de charger le portefeuille. Vérifiez votre connexion.');
    };
    const unsubscribes = [
      subscribeCryptos(setCryptos, onError),
      subscribeWallets(uid, setWallets, onError),
      subscribeUserCashRequests(uid, REQUESTS_LIMIT, setRequests, onError),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  // Un wallet par crypto du référentiel, à 0 si l'utilisateur n'en a pas.
  const holdings = useMemo(
    () => cryptos.map((crypto) => ({ crypto, valeur: wallets[crypto.id]?.valeur ?? 0 })),
    [cryptos, wallets]
  );
  const pendingRequests = requests.filter((r) => r.status === 'en_attente');

  const submitMovement = async () => {
    if (!movementType || submitting) {
      return;
    }
    const value = Number(montant.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }
    if (movementType === 'retrait' && value > solde) {
      Alert.alert('Erreur', 'Le montant demandé dépasse votre solde disponible');
      return;
    }
    setSubmitting(true);
    try {
      await requestCashMovement({ type: movementType, montant: value });
      setMovementType(null);
      setMontant('');
      Alert.alert('Demande envoyée', `Votre demande de ${movementType} sera traitée par un administrateur.`);
    } catch (error) {
      console.error('Demande refusée:', error);
      Alert.alert('Demande refusée', functionsErrorMessage(error, 'Une erreur est survenue. Réessayez.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async () => {
    if (!uid) {
      return;
    }
    setShowHistory(true);
    setHistory(null);
    try {
      setHistory(await fetchUserCashHistory(uid, HISTORY_LIMIT));
    } catch (error) {
      console.error("Chargement de l'historique impossible:", error);
      setShowHistory(false);
      Alert.alert('Erreur', "Impossible de récupérer l'historique des mouvements");
    }
  };

  return (
    <View style={styles.container}>
      {loadError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.card}>
            <Text style={styles.balanceLabel}>Solde disponible</Text>
            <Text style={styles.balanceAmount}>{formatMoney(solde)}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.depositButton]} onPress={() => setMovementType('depot')}>
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Dépôt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.withdrawButton]} onPress={() => setMovementType('retrait')}>
              <Ionicons name="remove-circle-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Retrait</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.historyButton]} onPress={openHistory}>
              <Ionicons name="time-outline" size={24} color="white" />
              <Text style={styles.actionButtonText}>Historique</Text>
            </TouchableOpacity>
          </View>

          {pendingRequests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Demandes en attente</Text>
              {pendingRequests.map((request) => (
                <View key={request.id} style={styles.row}>
                  <Text style={styles.rowLabel}>{request.type === 'depot' ? '⬆️ Dépôt' : '⬇️ Retrait'} — {formatMoney(request.montant)}</Text>
                  <Text style={styles.rowMuted}>{formatDateTime(request.date_creation)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mes Cryptomonnaies</Text>
            {holdings.length === 0 && <Text style={styles.rowMuted}>Référentiel indisponible</Text>}
            {holdings.map(({ crypto, valeur }) => (
              <View key={crypto.id} style={styles.row}>
                <View>
                  <Text style={styles.rowLabel}>{crypto.name}</Text>
                  <Text style={styles.rowMuted}>{formatMoney(crypto.price)} / {crypto.symbol}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.walletValue}>{valeur.toFixed(4)} {crypto.symbol}</Text>
                  <Text style={styles.rowMuted}>≈ {formatMoney(valeur * crypto.price)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal visible={movementType !== null} transparent animationType="slide" onRequestClose={() => setMovementType(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{movementType === 'depot' ? 'Demande de dépôt' : 'Demande de retrait'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Montant"
              keyboardType="decimal-pad"
              value={montant}
              onChangeText={setMontant}
              editable={!submitting}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setMontant(''); setMovementType(null); }}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={submitMovement} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.historyContent]}>
            <Text style={styles.modalTitle}>Historique des mouvements</Text>
            {history === null ? (
              <ActivityIndicator size="large" color="#2c3e50" style={styles.historyLoading} />
            ) : history.length === 0 && requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={50} color="#95a5a6" />
                <Text style={styles.emptyStateText}>Aucun mouvement</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList}>
                {requests.filter((r) => r.status !== 'validee').map((request) => (
                  <View key={request.id} style={styles.historyItem}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.historyAmount}>{request.type === 'depot' ? '+ ' : '- '}{formatMoney(request.montant)}</Text>
                      <Text style={[styles.historyType, request.status === 'refusee' ? styles.refusedText : styles.pendingText]}>
                        {request.type === 'depot' ? 'Dépôt' : 'Retrait'} · {STATUS_LABEL[request.status]}
                        {request.motif ? ` (${request.motif})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>{formatDateTime(request.date_validation ?? request.date_creation)}</Text>
                  </View>
                ))}
                {history.map((entry) => (
                  <View key={entry.id} style={styles.historyItem}>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.historyAmount, entry.is_depot ? styles.depotText : styles.retraitText]}>
                        {entry.is_depot ? '+ ' : '- '}{formatMoney(entry.valeur)}
                      </Text>
                      <Text style={[styles.historyType, entry.is_depot ? styles.depotText : styles.retraitText]}>
                        {entry.is_depot ? '⬆️ Dépôt' : '⬇️ Retrait'} · Validé
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>{formatDateTime(entry.dateheure)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowHistory(false)}>
              <Ionicons name="close-circle-outline" size={24} color="#fff" />
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#e74c3c', fontSize: 16, textAlign: 'center' },
  scrollView: { flex: 1 },
  card: { backgroundColor: '#fff', padding: 20, margin: 15, marginBottom: 0, borderRadius: 10, elevation: 3 },
  balanceLabel: { fontSize: 16, color: '#666' },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginTop: 5 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 15 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginHorizontal: 5 },
  depositButton: { backgroundColor: '#2ecc71' },
  withdrawButton: { backgroundColor: '#e74c3c' },
  historyButton: { backgroundColor: '#3498db' },
  actionButtonText: { color: '#fff', marginLeft: 5, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#2c3e50' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowRight: { alignItems: 'flex-end' },
  rowLabel: { fontSize: 16, color: '#2c3e50' },
  rowMuted: { fontSize: 12, color: '#7f8c8d' },
  walletValue: { fontSize: 16, fontWeight: '500', color: '#2ecc71' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '85%' },
  historyContent: { maxHeight: '80%', width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { padding: 12, borderRadius: 5, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  confirmButton: { backgroundColor: '#2ecc71' },
  cancelButton: { backgroundColor: '#95a5a6' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historyLoading: { marginVertical: 30 },
  historyList: { marginVertical: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 10, marginBottom: 10 },
  transactionInfo: { flex: 1, marginRight: 10 },
  historyAmount: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#2c3e50' },
  historyType: { fontSize: 14 },
  historyDate: { fontSize: 12, color: '#666', textAlign: 'right' },
  depotText: { color: '#27ae60' },
  retraitText: { color: '#e74c3c' },
  pendingText: { color: '#f39c12' },
  refusedText: { color: '#e74c3c' },
  closeButton: { backgroundColor: '#95a5a6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 10, marginTop: 15 },
  closeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyStateText: { fontSize: 16, color: '#95a5a6', marginTop: 10, textAlign: 'center' },
});

export default Portefeuille;
