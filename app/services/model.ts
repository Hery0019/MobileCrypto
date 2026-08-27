/**
 * Miroir client du schéma Firestore (functions/src/model.ts) : noms de
 * collections et types des documents. Toute lecture passe par ces constantes
 * — plus de littéraux de collection dans les écrans.
 */
import { Timestamp } from 'firebase/firestore';

export const COLLECTIONS = {
  users: 'utilisateurs',
  cryptos: 'cryptocurrencies',
  wallets: 'wallets',
  transactions: 'transactions',
  cashRequests: 'notifications',
  cashHistory: 'historiquedepot',
} as const;

export const walletId = (uid: string, cryptoId: string): string => `${uid}_${cryptoId}`;

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  contact: string;
  photoURL: string | null;
  role: UserRole;
  porteFeuille: number;
}

export interface PricePoint {
  price: number;
  at: Date;
}

export interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  history: PricePoint[];
}

export interface Wallet {
  id: string;
  crypto: string;
  valeur: number;
}

export interface Transaction {
  id: string;
  utilisateur: string;
  userEmail?: string;
  id_crypto: string;
  cryptoName: string;
  cryptoSymbol: string;
  is_achat: boolean;
  valeur: number;
  prix_unitaire: number;
  montant_total: number;
  date_heure: Date;
}

export type CashRequestStatus = 'en_attente' | 'validee' | 'refusee';
export type CashMovementType = 'depot' | 'retrait';

export interface CashRequest {
  id: string;
  type: CashMovementType;
  montant: number;
  utilisateur: string;
  userEmail?: string;
  status: CashRequestStatus;
  date_creation: Date | null;
  date_validation: Date | null;
  motif?: string;
}

export interface CashHistoryEntry {
  id: string;
  valeur: number;
  is_depot: boolean;
  dateheure: Date;
}

/** Timestamp Firestore → Date (null si absent, ex. serverTimestamp en attente). */
export const toDate = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : null;
