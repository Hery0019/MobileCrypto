/**
 * placeOrder : achat ou vente de crypto, exécuté dans une transaction
 * Firestore au prix serveur courant. Le client ne fournit que le type,
 * la crypto et la quantité ; soldes et prix sont relus côté serveur.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './admin';
import { requirePositiveNumber, requireString, requireUser, toHttpsError } from './authz';
import { CRYPTO_DECIMALS, computeOrder, OrderType } from './money';
import { COLLECTIONS, CryptoDoc, TransactionDoc, UserDoc, WalletDoc, walletId } from './model';

export interface PlaceOrderData {
  type: OrderType;
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

const parseType = (value: unknown): OrderType => {
  if (value !== 'achat' && value !== 'vente') {
    throw new HttpsError('invalid-argument', "Champ 'type' doit valoir 'achat' ou 'vente'");
  }
  return value;
};

export const placeOrder = onCall<PlaceOrderData, Promise<PlaceOrderResult>>(async (request) => {
  const caller = requireUser(request);
  const data = (request.data ?? {}) as Partial<PlaceOrderData>;
  const type = parseType(data.type);
  const cryptoId = requireString(data.cryptoId, 'cryptoId');
  // Quantité normalisée à la précision de stockage.
  const quantite =
    Math.round(requirePositiveNumber(data.quantite, 'quantite') * 10 ** CRYPTO_DECIMALS) / 10 ** CRYPTO_DECIMALS;

  const userRef = db.collection(COLLECTIONS.users).doc(caller.uid);
  const cryptoRef = db.collection(COLLECTIONS.cryptos).doc(cryptoId);
  const walletRef = db.collection(COLLECTIONS.wallets).doc(walletId(caller.uid, cryptoId));
  const transactionRef = db.collection(COLLECTIONS.transactions).doc();

  try {
    return await db.runTransaction(async (tx) => {
      const [userSnap, cryptoSnap, walletSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(cryptoRef),
        tx.get(walletRef),
      ]);
      if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Profil utilisateur introuvable');
      }
      if (!cryptoSnap.exists) {
        throw new HttpsError('not-found', 'Crypto-monnaie inconnue');
      }
      const user = userSnap.data() as UserDoc;
      const crypto = cryptoSnap.data() as CryptoDoc;
      const wallet = walletSnap.exists ? (walletSnap.data() as WalletDoc) : undefined;

      const computed = computeOrder({
        type,
        quantite,
        prixUnitaire: Number(crypto.price),
        soldeFiat: Number(user.porteFeuille ?? 0),
        soldeCrypto: Number(wallet?.valeur ?? 0),
      });

      tx.update(userRef, { porteFeuille: computed.nouveauSoldeFiat });
      const walletUpdate: WalletDoc = {
        utilisateur: caller.uid,
        crypto: cryptoId,
        valeur: computed.nouveauSoldeCrypto,
      };
      tx.set(walletRef, { ...walletUpdate, updated_at: FieldValue.serverTimestamp() }, { merge: true });
      const transaction: Omit<TransactionDoc, 'date_heure'> = {
        utilisateur: caller.uid,
        userEmail: caller.email,
        id_crypto: cryptoId,
        cryptoName: crypto.name,
        cryptoSymbol: crypto.symbol,
        is_achat: type === 'achat',
        valeur: quantite,
        prix_unitaire: Number(crypto.price),
        montant_total: computed.montantTotal,
      };
      tx.set(transactionRef, { ...transaction, date_heure: FieldValue.serverTimestamp() });

      return {
        transactionId: transactionRef.id,
        prixUnitaire: Number(crypto.price),
        montantTotal: computed.montantTotal,
        nouveauSoldeFiat: computed.nouveauSoldeFiat,
        nouveauSoldeCrypto: computed.nouveauSoldeCrypto,
      };
    });
  } catch (error) {
    throw toHttpsError(error);
  }
});
