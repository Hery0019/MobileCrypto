import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchTransactionsPage, fetchUsersPage, subscribePendingCashRequests } from '../services/firestore';
import { functionsErrorMessage, reviewCashMovement } from '../services/functions';
import { CashRequest, Transaction, UserProfile } from '../services/model';

type Tab = 'notifications' | 'users' | 'transactions';
const PAGE_SIZE = 25;
const PENDING_LIMIT = 50;

const formatMoney = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatDateTime = (date: Date | null) => (date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : '—');

/** Liste paginée générique (utilisateurs, transactions) chargée à la demande. */
function usePagedList<T>(fetchPage: (size: number, after?: QueryDocumentSnapshot) => Promise<{ items: T[]; cursor?: QueryDocumentSnapshot }>, active: boolean) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async (reset = false) => {
    if (loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(PAGE_SIZE, reset ? undefined : cursor);
      setItems((current) => (reset ? page.items : [...current, ...page.items]));
      setCursor(page.cursor);
      setHasMore(page.cursor !== undefined);
      setLoaded(true);
    } catch (e) {
      console.error('Chargement de la liste impossible:', e);
      setError('Chargement impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [fetchPage, cursor, loading]);

  // Chargement uniquement quand l'onglet devient actif, une seule fois.
  useEffect(() => {
    if (active && !loaded && !loading) {
      void loadMore(true);
    }
  }, [active, loaded, loading, loadMore]);

  return { items, hasMore, loading, error, loadMore, refresh: () => loadMore(true) };
}

const Admin = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const [pending, setPending] = useState<CashRequest[]>([]);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const users = usePagedList(fetchUsersPage, activeTab === 'users');
  const transactions = usePagedList(fetchTransactionsPage, activeTab === 'transactions');

  useEffect(
    () =>
      subscribePendingCashRequests(PENDING_LIMIT, setPending, (error) => {
        console.error('Abonnement aux demandes impossible:', error);
        setPendingError('Impossible de récupérer les demandes en attente.');
      }),
    []
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const review = async (request: CashRequest, approve: boolean) => {
    if (reviewing) {
      return;
    }
    setReviewing(request.id);
    try {
      // Le serveur vérifie le statut et le solde dans une transaction ; la
      // liste se met à jour d'elle-même via l'abonnement.
      await reviewCashMovement({ requestId: request.id, approve });
      Alert.alert('Succès', `La demande a été ${approve ? 'validée' : 'refusée'}.`);
    } catch (error) {
      console.error('Validation refusée:', error);
      Alert.alert('Impossible', functionsErrorMessage(error, 'Une erreur est survenue lors de la validation'));
    } finally {
      setReviewing(null);
    }
  };

  const confirmReview = (request: CashRequest, approve: boolean) => {
    Alert.alert(
      approve ? 'Valider la demande' : 'Refuser la demande',
      `${request.type === 'depot' ? 'Dépôt' : 'Retrait'} de ${formatMoney(request.montant)} pour ${request.userEmail ?? request.utilisateur}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: approve ? 'Valider' : 'Refuser', style: approve ? 'default' : 'destructive', onPress: () => review(request, approve) },
      ]
    );
  };

  const renderUser = ({ item }: { item: UserProfile }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.email}</Text>
        <Text style={[styles.badge, { backgroundColor: item.role === 'admin' ? '#3498db' : '#2ecc71' }]}>{item.role}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.muted}>{item.prenom} {item.nom}</Text>
        <Text style={styles.balanceValue}>{formatMoney(item.porteFeuille)}</Text>
      </View>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.strong, { color: item.is_achat ? '#2ecc71' : '#e74c3c' }]}>{item.is_achat ? 'ACHAT' : 'VENTE'}</Text>
        <Text style={styles.muted}>{formatDateTime(item.date_heure)}</Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.strong}>{item.cryptoName}</Text>
          <Text style={styles.muted}>{item.valeur} {item.cryptoSymbol} à {formatMoney(item.prix_unitaire)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.strong}>{formatMoney(item.montant_total)}</Text>
          <Text style={styles.muted}>{item.userEmail ?? 'compte supprimé'}</Text>
        </View>
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: CashRequest }) => {
    const busy = reviewing === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Ionicons name={item.type === 'depot' ? 'arrow-down-circle' : 'arrow-up-circle'} size={24} color={item.type === 'depot' ? '#2ecc71' : '#e74c3c'} />
            <Text style={[styles.strong, { color: item.type === 'depot' ? '#2ecc71' : '#e74c3c', marginLeft: 8 }]}>{item.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.muted}>{formatDateTime(item.date_creation)}</Text>
        </View>
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.muted}>{item.userEmail ?? item.utilisateur}</Text>
            <Text style={styles.strong}>Montant : {formatMoney(item.montant)}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => confirmReview(item, true)} disabled={reviewing !== null}>
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={20} color="white" />}
              <Text style={styles.actionButtonText}>Valider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => confirmReview(item, false)} disabled={reviewing !== null}>
              <Ionicons name="close-circle-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = (list: { hasMore: boolean; loading: boolean; error: string | null; loadMore: () => void }) => (
    <View style={styles.footer}>
      {list.error && <Text style={styles.errorText}>{list.error}</Text>}
      {list.loading ? (
        <ActivityIndicator color="#2c3e50" />
      ) : list.hasMore || list.error ? (
        <TouchableOpacity style={styles.loadMore} onPress={() => list.loadMore()}>
          <Text style={styles.loadMoreText}>{list.error ? 'Réessayer' : 'Charger plus'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const tabs: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'notifications', label: `Demandes${pending.length ? ` (${pending.length})` : ''}`, icon: 'notifications-outline' },
    { key: 'users', label: 'Utilisateurs', icon: 'people-outline' },
    { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administration</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.activeTab]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={24} color={activeTab === tab.key ? '#2c3e50' : '#7f8c8d'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'notifications' && (
        <FlatList
          data={pending}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{pendingError ?? 'Aucune demande en attente'}</Text>
            </View>
          }
        />
      )}
      {activeTab === 'users' && (
        <FlatList
          data={users.items}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onEndReached={() => users.hasMore && !users.loading && users.loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter(users)}
        />
      )}
      {activeTab === 'transactions' && (
        <FlatList
          data={transactions.items}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onEndReached={() => transactions.hasMore && !transactions.loading && transactions.loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter(transactions)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  logoutButton: { padding: 8 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2c3e50' },
  tabText: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
  activeTabText: { color: '#2c3e50', fontWeight: 'bold' },
  list: { padding: 15 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, color: '#fff', fontSize: 12, fontWeight: '500', overflow: 'hidden' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  right: { alignItems: 'flex-end' },
  strong: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  muted: { fontSize: 14, color: '#7f8c8d' },
  balanceValue: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
  typeContainer: { flexDirection: 'row', alignItems: 'center' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, minWidth: 100, justifyContent: 'center' },
  approveButton: { backgroundColor: '#2ecc71' },
  rejectButton: { backgroundColor: '#e74c3c' },
  actionButtonText: { color: '#fff', marginLeft: 4, fontSize: 14, fontWeight: '500' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#7f8c8d', textAlign: 'center' },
  footer: { padding: 15, alignItems: 'center' },
  errorText: { color: '#e74c3c', marginBottom: 8 },
  loadMore: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2c3e50' },
  loadMoreText: { color: '#2c3e50', fontWeight: '500' },
});

export default Admin;
