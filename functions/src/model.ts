/**
 * Schéma Firestore : noms de collections et forme des documents.
 * Seule source de vérité côté serveur ; le client a son miroir dans
 * app/services/model.ts (mêmes noms de champs).
 */
import type { Timestamp } from 'firebase-admin/firestore';

export const COLLECTIONS = {
  users: 'utilisateurs',
  cryptos: 'cryptocurrencies',
  wallets: 'wallets',
  transactions: 'transactions',
  cashRequests: 'notifications',
  cashHistory: 'historiquedepot',
} as const;

/** Identifiant déterministe : un seul wallet possible par (utilisateur, crypto). */
export const walletId = (uid: string, cryptoId: string): string => `${uid}_${cryptoId}`;

export type UserRole = 'user' | 'admin';

export interface UserDoc {
  email: string;
  nom: string;
  prenom: string;
  contact: string;
  photoURL: string | null;
  /** Miroir du custom claim 'admin', pour affichage uniquement. */
  role: UserRole;
  /** Solde fiat (USD), 2 décimales. */
  porteFeuille: number;
  date_creation?: Timestamp;
}

export interface CryptoDoc {
  name: string;
  symbol: string;
  /** Prix unitaire en USD, 2 décimales. */
  price: number;
  /** Derniers prix (max PRICE_HISTORY_LENGTH), du plus ancien au plus récent. */
  history?: { price: number; at: Timestamp }[];
  updated_at?: Timestamp;
}

export interface WalletDoc {
  utilisateur: string;
  crypto: string;
  /** Quantité détenue, 8 décimales. */
  valeur: number;
  updated_at?: Timestamp;
}

export interface TransactionDoc {
  utilisateur: string;
  /** Dénormalisé pour l'affichage admin ; effacé à la suppression du compte. */
  userEmail?: string;
  id_crypto: string;
  cryptoName: string;
  cryptoSymbol: string;
  is_achat: boolean;
  /** Quantité de crypto. */
  valeur: number;
  prix_unitaire: number;
  montant_total: number;
  date_heure: Timestamp;
}

export type CashRequestStatus = 'en_attente' | 'validee' | 'refusee';

export interface CashRequestDoc {
  type: 'depot' | 'retrait';
  montant: number;
  utilisateur: string;
  userEmail?: string;
  status: CashRequestStatus;
  date_creation: Timestamp;
  date_validation?: Timestamp;
  validee_par?: string;
  motif?: string;
}

export interface CashHistoryDoc {
  utilisateur: string;
  valeur: number;
  is_depot: boolean;
  dateheure: Timestamp;
  /** Demande d'origine (notifications/{id}). */
  demande?: string;
}
