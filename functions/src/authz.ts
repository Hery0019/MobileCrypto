import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { MoneyError } from './money';

export interface Caller {
  uid: string;
  email: string;
}

/** Appelant authentifié avec e-mail vérifié. */
export const requireUser = (request: CallableRequest<unknown>): Caller => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Connexion requise');
  }
  if (auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Adresse e-mail non vérifiée');
  }
  return { uid: auth.uid, email: auth.token.email ?? '' };
};

/** Appelant porteur du custom claim admin (posé par scripts/set-admin). */
export const requireAdmin = (request: CallableRequest<unknown>): Caller => {
  const caller = requireUser(request);
  if (request.auth?.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Réservé aux administrateurs');
  }
  return caller;
};

/**
 * Normalise une erreur en HttpsError : les erreurs métier deviennent
 * failed-precondition avec leur code, le reste est masqué en 'internal'.
 */
export const toHttpsError = (error: unknown): HttpsError => {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof MoneyError) {
    return new HttpsError('failed-precondition', error.message, { code: error.code });
  }
  logger.error('Erreur inattendue', error);
  return new HttpsError('internal', 'Une erreur interne est survenue');
};

export const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpsError('invalid-argument', `Champ '${field}' manquant ou invalide`);
  }
  return value.trim();
};

export const requirePositiveNumber = (value: unknown, field: string): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpsError('invalid-argument', `Champ '${field}' doit être un nombre strictement positif`);
  }
  return n;
};
