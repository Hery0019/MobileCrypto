/**
 * Cours des cryptos : une seule source de vérité (cryptocurrencies/{id}.price),
 * mise à jour par une tâche planifiée. Le prix d'exécution des ordres
 * (placeOrder) et le prix affiché (Accueil) sont donc identiques.
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from './admin';
import { FIAT_DECIMALS } from './money';
import { COLLECTIONS, CryptoDoc } from './model';

/** Nombre de points d'historique conservés sur le document (≈ 1 h à 1/min). */
export const PRICE_HISTORY_LENGTH = 60;
/** Variation maximale par tick (±2 %). */
const MAX_STEP = 0.02;
const MIN_PRICE = 0.01;

/** Référentiel initial, identifiants alignés sur les données existantes. */
export const DEFAULT_CRYPTOS: Record<string, Omit<CryptoDoc, 'history' | 'updated_at'>> = {
  '1': { name: 'Bitcoin', symbol: 'BTC', price: 6000 },
  '2': { name: 'Ethereum', symbol: 'ETH', price: 4000 },
  '3': { name: 'Cardano', symbol: 'ADA', price: 5000 },
};

const roundPrice = (value: number): number =>
  Math.max(MIN_PRICE, Math.round(value * 10 ** FIAT_DECIMALS) / 10 ** FIAT_DECIMALS);

/** Marche aléatoire bornée : prix × (1 ± MAX_STEP). Pure, testable. */
export const nextPrice = (current: number, random: () => number = Math.random): number =>
  roundPrice(current * (1 + (random() * 2 - 1) * MAX_STEP));

/** Crée le référentiel s'il est vide (premier déploiement). */
export const seedCryptosIfEmpty = async (): Promise<boolean> => {
  const snapshot = await db.collection(COLLECTIONS.cryptos).limit(1).get();
  if (!snapshot.empty) {
    return false;
  }
  const batch = db.batch();
  for (const [id, crypto] of Object.entries(DEFAULT_CRYPTOS)) {
    batch.set(db.collection(COLLECTIONS.cryptos).doc(id), {
      ...crypto,
      history: [{ price: crypto.price, at: Timestamp.now() }],
      updated_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  logger.info('Référentiel cryptocurrencies initialisé', { ids: Object.keys(DEFAULT_CRYPTOS) });
  return true;
};

export const tickPrices = async (): Promise<number> => {
  if (await seedCryptosIfEmpty()) {
    return Object.keys(DEFAULT_CRYPTOS).length;
  }
  const snapshot = await db.collection(COLLECTIONS.cryptos).get();
  const batch = db.batch();
  const now = Timestamp.now();
  snapshot.docs.forEach((doc) => {
    const crypto = doc.data() as CryptoDoc;
    const price = nextPrice(Number(crypto.price) || MIN_PRICE);
    const history = [...(crypto.history ?? []), { price, at: now }].slice(-PRICE_HISTORY_LENGTH);
    batch.update(doc.ref, { price, history, updated_at: FieldValue.serverTimestamp() });
  });
  await batch.commit();
  return snapshot.size;
};

/** Cloud Scheduler : granularité minimale d'une minute. */
export const updatePrices = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Indian/Antananarivo' }, async () => {
  const count = await tickPrices();
  logger.debug('Cours mis à jour', { count });
});
