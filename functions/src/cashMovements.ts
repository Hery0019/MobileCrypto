/**
 * Demandes de dépôt/retrait (collection 'notifications') et leur validation
 * par un administrateur. Le bénéficiaire est toujours l'uid authentifié à la
 * création, jamais un e-mail fourni par le client.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './admin';
import { requireAdmin, requirePositiveNumber, requireString, requireUser, toHttpsError } from './authz';
import { CashMovementType, computeCashMovement, FIAT_DECIMALS } from './money';
import { CashHistoryDoc, CashRequestDoc, COLLECTIONS, UserDoc } from './model';

/** Nombre maximal de demandes en attente par utilisateur. */
const MAX_PENDING_REQUESTS = 5;

const parseMovementType = (value: unknown): CashMovementType => {
  if (value !== 'depot' && value !== 'retrait') {
    throw new HttpsError('invalid-argument', "Champ 'type' doit valoir 'depot' ou 'retrait'");
  }
  return value;
};

export interface RequestCashMovementData {
  type: CashMovementType;
  montant: number;
}

export interface RequestCashMovementResult {
  requestId: string;
  montant: number;
}

export const requestCashMovement = onCall<RequestCashMovementData, Promise<RequestCashMovementResult>>(
  async (request) => {
    const caller = requireUser(request);
    const data = (request.data ?? {}) as Partial<RequestCashMovementData>;
    const type = parseMovementType(data.type);
    const montant =
      Math.round(requirePositiveNumber(data.montant, 'montant') * 10 ** FIAT_DECIMALS) / 10 ** FIAT_DECIMALS;
    if (montant <= 0) {
      throw new HttpsError('invalid-argument', 'Montant inférieur au centime');
    }

    const userRef = db.collection(COLLECTIONS.users).doc(caller.uid);
    const requestRef = db.collection(COLLECTIONS.cashRequests).doc();
    const pendingQuery = db
      .collection(COLLECTIONS.cashRequests)
      .where('utilisateur', '==', caller.uid)
      .where('status', '==', 'en_attente');

    try {
      await db.runTransaction(async (tx) => {
        const [userSnap, pendingSnap] = await Promise.all([tx.get(userRef), tx.get(pendingQuery)]);
        if (!userSnap.exists) {
          throw new HttpsError('failed-precondition', 'Profil utilisateur introuvable');
        }
        if (pendingSnap.size >= MAX_PENDING_REQUESTS) {
          throw new HttpsError('resource-exhausted', 'Trop de demandes en attente de validation');
        }
        const user = userSnap.data() as UserDoc;
        // Contrôle indicatif : le contrôle définitif est refait à la validation.
        if (type === 'retrait') {
          computeCashMovement({ type, montant, soldeFiat: Number(user.porteFeuille ?? 0) });
        }
        const doc: Omit<CashRequestDoc, 'date_creation'> = {
          type,
          montant,
          utilisateur: caller.uid,
          userEmail: caller.email,
          status: 'en_attente',
        };
        tx.set(requestRef, { ...doc, date_creation: FieldValue.serverTimestamp() });
      });
    } catch (error) {
      throw toHttpsError(error);
    }
    return { requestId: requestRef.id, montant };
  }
);

export interface ReviewCashMovementData {
  requestId: string;
  approve: boolean;
  motif?: string;
}

export interface ReviewCashMovementResult {
  status: 'validee' | 'refusee';
  nouveauSoldeFiat?: number;
}

export const reviewCashMovement = onCall<ReviewCashMovementData, Promise<ReviewCashMovementResult>>(
  async (request) => {
    const admin = requireAdmin(request);
    const data = (request.data ?? {}) as Partial<ReviewCashMovementData>;
    const requestId = requireString(data.requestId, 'requestId');
    if (typeof data.approve !== 'boolean') {
      throw new HttpsError('invalid-argument', "Champ 'approve' doit être un booléen");
    }
    const approve = data.approve;
    const motif = typeof data.motif === 'string' ? data.motif.trim().slice(0, 500) : undefined;

    const requestRef = db.collection(COLLECTIONS.cashRequests).doc(requestId);
    const historyRef = db.collection(COLLECTIONS.cashHistory).doc();

    try {
      return await db.runTransaction(async (tx) => {
        const requestSnap = await tx.get(requestRef);
        if (!requestSnap.exists) {
          throw new HttpsError('not-found', 'Demande introuvable');
        }
        const cashRequest = requestSnap.data() as CashRequestDoc;
        if (cashRequest.status !== 'en_attente') {
          // Idempotence : une demande déjà traitée (double clic, second admin)
          // n'est jamais rejouée.
          throw new HttpsError('failed-precondition', 'Cette demande a déjà été traitée');
        }

        const decision = {
          date_validation: FieldValue.serverTimestamp(),
          validee_par: admin.uid,
          ...(motif ? { motif } : {}),
        };

        if (!approve) {
          tx.update(requestRef, { status: 'refusee', ...decision });
          return { status: 'refusee' as const };
        }

        if (!cashRequest.utilisateur) {
          throw new HttpsError('failed-precondition', 'Demande sans utilisateur identifié (donnée héritée)');
        }
        const userRef = db.collection(COLLECTIONS.users).doc(cashRequest.utilisateur);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
          throw new HttpsError('failed-precondition', 'Utilisateur de la demande introuvable');
        }
        const user = userSnap.data() as UserDoc;

        // Un retrait supérieur au solde lève solde-insuffisant : la transaction
        // est annulée et la demande reste 'en_attente' (l'admin peut la refuser).
        const computed = computeCashMovement({
          type: cashRequest.type,
          montant: Number(cashRequest.montant),
          soldeFiat: Number(user.porteFeuille ?? 0),
        });

        tx.update(userRef, { porteFeuille: computed.nouveauSoldeFiat });
        const history: Omit<CashHistoryDoc, 'dateheure'> = {
          utilisateur: cashRequest.utilisateur,
          valeur: computed.montant,
          is_depot: cashRequest.type === 'depot',
          demande: requestId,
        };
        tx.set(historyRef, { ...history, dateheure: FieldValue.serverTimestamp() });
        tx.update(requestRef, { status: 'validee', ...decision });

        return { status: 'validee' as const, nouveauSoldeFiat: computed.nouveauSoldeFiat };
      });
    } catch (error) {
      throw toHttpsError(error);
    }
  }
);
