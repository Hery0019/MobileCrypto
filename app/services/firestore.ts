/**
 * Couche d'accès Firestore côté client : lectures typées et abonnements
 * temps réel. Aucune écriture monétaire ici (voir services/functions.ts).
 */
import {
  collection,
  doc,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FIREBASE_DB } from '../../FirebaseConfig';
import {
  CashHistoryEntry,
  CashRequest,
  COLLECTIONS,
  Crypto,
  toDate,
  Transaction,
  UserProfile,
  Wallet,
} from './model';

export type Unsubscribe = () => void;
type Listener<T> = (value: T) => void;
type ErrorListener = (error: Error) => void;

const number = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const userFromSnapshot = (id: string, data: DocumentData): UserProfile => ({
  id,
  email: data.email ?? '',
  nom: data.nom ?? '',
  prenom: data.prenom ?? '',
  contact: data.contact ?? '',
  photoURL: data.photoURL || data.photo || null,
  role: data.role === 'admin' ? 'admin' : 'user',
  porteFeuille: number(data.porteFeuille),
});

const cryptoFromSnapshot = (snap: QueryDocumentSnapshot): Crypto => {
  const data = snap.data();
  const history = Array.isArray(data.history)
    ? data.history
        .map((p: { price: unknown; at: unknown }) => ({ price: number(p.price), at: toDate(p.at) }))
        .filter((p: { at: Date | null }): p is { price: number; at: Date } => p.at !== null)
    : [];
  return { id: snap.id, name: data.name ?? snap.id, symbol: data.symbol ?? '', price: number(data.price), history };
};

const transactionFromSnapshot = (snap: QueryDocumentSnapshot): Transaction => {
  const data = snap.data();
  return {
    id: snap.id,
    utilisateur: data.utilisateur ?? '',
    userEmail: data.userEmail,
    id_crypto: String(data.id_crypto ?? ''),
    cryptoName: data.cryptoName ?? 'Crypto inconnue',
    cryptoSymbol: data.cryptoSymbol ?? '???',
    is_achat: Boolean(data.is_achat),
    valeur: number(data.valeur),
    prix_unitaire: number(data.prix_unitaire),
    montant_total: number(data.montant_total),
    date_heure: toDate(data.date_heure) ?? new Date(0),
  };
};

const cashRequestFromSnapshot = (snap: QueryDocumentSnapshot): CashRequest => {
  const data = snap.data();
  return {
    id: snap.id,
    type: data.type === 'retrait' ? 'retrait' : 'depot',
    montant: number(data.montant),
    utilisateur: data.utilisateur ?? '',
    userEmail: data.userEmail,
    status: data.status ?? 'en_attente',
    date_creation: toDate(data.date_creation),
    date_validation: toDate(data.date_validation),
    motif: data.motif,
  };
};

/** Profil de l'utilisateur, en temps réel (solde mis à jour après validation admin). */
export const subscribeUserProfile = (
  uid: string,
  onValue: Listener<UserProfile | null>,
  onError?: ErrorListener
): Unsubscribe =>
  onSnapshot(
    doc(FIREBASE_DB, COLLECTIONS.users, uid),
    (snap) => onValue(snap.exists() ? userFromSnapshot(snap.id, snap.data()) : null),
    onError
  );

export const updateUserPresentation = (uid: string, fields: Partial<Pick<UserProfile, 'nom' | 'prenom' | 'contact' | 'photoURL'>>) =>
  updateDoc(doc(FIREBASE_DB, COLLECTIONS.users, uid), fields);

/** Référentiel des cryptos avec leur cours courant et historique. */
export const subscribeCryptos = (onValue: Listener<Crypto[]>, onError?: ErrorListener): Unsubscribe =>
  onSnapshot(
    query(collection(FIREBASE_DB, COLLECTIONS.cryptos), orderBy('name')),
    (snap) => onValue(snap.docs.map(cryptoFromSnapshot)),
    onError
  );

/** Wallets de l'utilisateur, indexés par id de crypto. */
export const subscribeWallets = (
  uid: string,
  onValue: Listener<Record<string, Wallet>>,
  onError?: ErrorListener
): Unsubscribe =>
  onSnapshot(
    query(collection(FIREBASE_DB, COLLECTIONS.wallets), where('utilisateur', '==', uid)),
    (snap) => {
      const wallets: Record<string, Wallet> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        wallets[String(data.crypto)] = { id: d.id, crypto: String(data.crypto), valeur: number(data.valeur) };
      });
      onValue(wallets);
    },
    onError
  );

export const subscribeUserTransactions = (
  uid: string,
  max: number,
  onValue: Listener<Transaction[]>,
  onError?: ErrorListener
): Unsubscribe =>
  onSnapshot(
    query(
      collection(FIREBASE_DB, COLLECTIONS.transactions),
      where('utilisateur', '==', uid),
      orderBy('date_heure', 'desc'),
      limit(max)
    ),
    (snap) => onValue(snap.docs.map(transactionFromSnapshot)),
    onError
  );

export const subscribeUserCashRequests = (
  uid: string,
  max: number,
  onValue: Listener<CashRequest[]>,
  onError?: ErrorListener
): Unsubscribe =>
  onSnapshot(
    query(
      collection(FIREBASE_DB, COLLECTIONS.cashRequests),
      where('utilisateur', '==', uid),
      orderBy('date_creation', 'desc'),
      limit(max)
    ),
    (snap) => onValue(snap.docs.map(cashRequestFromSnapshot)),
    onError
  );

export const fetchUserCashHistory = async (uid: string, max: number): Promise<CashHistoryEntry[]> => {
  const snap = await getDocs(
    query(
      collection(FIREBASE_DB, COLLECTIONS.cashHistory),
      where('utilisateur', '==', uid),
      orderBy('dateheure', 'desc'),
      limit(max)
    )
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      valeur: number(data.valeur),
      is_depot: Boolean(data.is_depot),
      dateheure: toDate(data.dateheure) ?? new Date(0),
    };
  });
};

// ---------- Administration ----------

export const subscribePendingCashRequests = (
  max: number,
  onValue: Listener<CashRequest[]>,
  onError?: ErrorListener
): Unsubscribe =>
  onSnapshot(
    query(
      collection(FIREBASE_DB, COLLECTIONS.cashRequests),
      where('status', '==', 'en_attente'),
      orderBy('date_creation', 'desc'),
      limit(max)
    ),
    (snap) => onValue(snap.docs.map(cashRequestFromSnapshot)),
    onError
  );

export interface Page<T> {
  items: T[];
  /** Curseur pour la page suivante ; undefined s'il n'y a plus de résultats. */
  cursor?: QueryDocumentSnapshot;
}

export const fetchUsersPage = async (pageSize: number, after?: QueryDocumentSnapshot): Promise<Page<UserProfile>> => {
  const base = query(collection(FIREBASE_DB, COLLECTIONS.users), orderBy('email'), limit(pageSize));
  const snap = await getDocs(after ? query(base, startAfter(after)) : base);
  return {
    items: snap.docs.map((d) => userFromSnapshot(d.id, d.data())),
    cursor: snap.size === pageSize ? snap.docs[snap.size - 1] : undefined,
  };
};

export const fetchTransactionsPage = async (pageSize: number, after?: QueryDocumentSnapshot): Promise<Page<Transaction>> => {
  const base = query(collection(FIREBASE_DB, COLLECTIONS.transactions), orderBy('date_heure', 'desc'), limit(pageSize));
  const snap = await getDocs(after ? query(base, startAfter(after)) : base);
  return {
    items: snap.docs.map(transactionFromSnapshot),
    cursor: snap.size === pageSize ? snap.docs[snap.size - 1] : undefined,
  };
};
