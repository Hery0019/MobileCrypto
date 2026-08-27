/**
 * Appels des Cloud Functions : seules voies d'écriture monétaire.
 * Les signatures reflètent functions/src/{orders,cashMovements}.ts.
 */
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { FIREBASE_FUNCTIONS } from '../../FirebaseConfig';
import { CashMovementType } from './model';

export interface PlaceOrderData {
  type: 'achat' | 'vente';
  cryptoId: string;
  quantite: number;
}

export interface PlaceOrderResult {
  transactionId: string;
  prixUnitaire: number;
  montantTotal: number;
  nouveauSoldeFiat: number;
  nouveauSoldeCrypto: number;
}

export interface RequestCashMovementData {
  type: CashMovementType;
  montant: number;
}

export interface RequestCashMovementResult {
  requestId: string;
  montant: number;
}

export interface ReviewCashMovementData {
  requestId: string;
  approve: boolean;
  motif?: string;
}

export interface ReviewCashMovementResult {
  status: 'validee' | 'refusee';
  nouveauSoldeFiat?: number;
}

const call = <TData, TResult>(name: string) => {
  const callable = httpsCallable<TData, TResult>(FIREBASE_FUNCTIONS, name);
  return async (data: TData): Promise<TResult> => (await callable(data)).data;
};

export const placeOrder = call<PlaceOrderData, PlaceOrderResult>('placeOrder');
export const requestCashMovement = call<RequestCashMovementData, RequestCashMovementResult>('requestCashMovement');
export const reviewCashMovement = call<ReviewCashMovementData, ReviewCashMovementResult>('reviewCashMovement');

/**
 * Message utilisateur pour une erreur d'appel : les erreurs métier
 * (failed-precondition, invalid-argument, …) portent un message lisible
 * écrit par le serveur ; les autres sont masquées.
 */
export const functionsErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof FirebaseError) {
    const code = error.code.replace('functions/', '');
    if (['failed-precondition', 'invalid-argument', 'not-found', 'resource-exhausted', 'permission-denied'].includes(code)) {
      return error.message;
    }
    if (code === 'unauthenticated') {
      return 'Session expirée, reconnectez-vous.';
    }
    if (code === 'unavailable' || code === 'deadline-exceeded') {
      return 'Service indisponible, réessayez dans un instant.';
    }
  }
  return fallback;
};
