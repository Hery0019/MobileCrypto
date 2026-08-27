/**
 * Logique monétaire pure (sans Firestore) : toutes les opérations sont faites
 * en unités entières (centimes pour le fiat, 1e-8 pour les cryptos) afin
 * d'éviter la dérive des flottants sur les additions successives.
 * Les valeurs stockées restent des nombres décimaux (pas de migration d'unité).
 */

export const FIAT_DECIMALS = 2;
export const CRYPTO_DECIMALS = 8;

export type OrderType = 'achat' | 'vente';
export type CashMovementType = 'depot' | 'retrait';

export type MoneyErrorCode =
  | 'quantite-invalide'
  | 'prix-invalide'
  | 'montant-invalide'
  | 'solde-insuffisant'
  | 'crypto-insuffisante';

export class MoneyError extends Error {
  constructor(public readonly code: MoneyErrorCode, message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Convertit un décimal en unités entières (arrondi au plus proche). */
export const toUnits = (value: number, decimals: number): bigint => {
  if (!isFiniteNumber(value)) {
    throw new MoneyError('montant-invalide', 'Valeur numérique invalide');
  }
  return BigInt(Math.round(value * 10 ** decimals));
};

/** Convertit des unités entières en décimal. */
export const fromUnits = (units: bigint, decimals: number): number =>
  Number(units) / 10 ** decimals;

/** Division entière arrondie au plus proche (bigint, dénominateur > 0). */
const divRound = (numerator: bigint, denominator: bigint): bigint => {
  const half = denominator / 2n;
  return numerator >= 0n
    ? (numerator + half) / denominator
    : -((-numerator + half) / denominator);
};

export interface OrderInput {
  type: OrderType;
  /** Quantité de crypto échangée. */
  quantite: number;
  /** Prix unitaire en fiat, déterminé par le serveur. */
  prixUnitaire: number;
  soldeFiat: number;
  soldeCrypto: number;
}

export interface OrderResult {
  nouveauSoldeFiat: number;
  nouveauSoldeCrypto: number;
  /** Montant fiat effectivement débité (achat) ou crédité (vente). */
  montantTotal: number;
}

export const computeOrder = (input: OrderInput): OrderResult => {
  const { type, quantite, prixUnitaire, soldeFiat, soldeCrypto } = input;

  if (!isFiniteNumber(quantite) || quantite <= 0) {
    throw new MoneyError('quantite-invalide', 'La quantité doit être strictement positive');
  }
  if (!isFiniteNumber(prixUnitaire) || prixUnitaire <= 0) {
    throw new MoneyError('prix-invalide', 'Prix unitaire indisponible');
  }

  const qtyUnits = toUnits(quantite, CRYPTO_DECIMALS);
  if (qtyUnits <= 0n) {
    throw new MoneyError('quantite-invalide', 'Quantité inférieure à la précision minimale');
  }
  const priceUnits = toUnits(prixUnitaire, FIAT_DECIMALS);
  // total(centimes) = qty(1e-8) × prix(centimes) / 1e8, arrondi au centime
  const totalUnits = divRound(qtyUnits * priceUnits, 10n ** BigInt(CRYPTO_DECIMALS));
  if (totalUnits <= 0n) {
    throw new MoneyError('quantite-invalide', 'Montant total nul');
  }

  const fiatUnits = toUnits(soldeFiat, FIAT_DECIMALS);
  const cryptoUnits = toUnits(soldeCrypto, CRYPTO_DECIMALS);

  if (type === 'achat') {
    if (fiatUnits < totalUnits) {
      throw new MoneyError('solde-insuffisant', 'Solde insuffisant pour cet achat');
    }
    return {
      nouveauSoldeFiat: fromUnits(fiatUnits - totalUnits, FIAT_DECIMALS),
      nouveauSoldeCrypto: fromUnits(cryptoUnits + qtyUnits, CRYPTO_DECIMALS),
      montantTotal: fromUnits(totalUnits, FIAT_DECIMALS),
    };
  }

  if (cryptoUnits < qtyUnits) {
    throw new MoneyError('crypto-insuffisante', 'Solde en crypto insuffisant pour cette vente');
  }
  return {
    nouveauSoldeFiat: fromUnits(fiatUnits + totalUnits, FIAT_DECIMALS),
    nouveauSoldeCrypto: fromUnits(cryptoUnits - qtyUnits, CRYPTO_DECIMALS),
    montantTotal: fromUnits(totalUnits, FIAT_DECIMALS),
  };
};

export interface CashMovementInput {
  type: CashMovementType;
  montant: number;
  soldeFiat: number;
}

export interface CashMovementResult {
  nouveauSoldeFiat: number;
  /** Montant normalisé au centime. */
  montant: number;
}

export const computeCashMovement = (input: CashMovementInput): CashMovementResult => {
  const { type, montant, soldeFiat } = input;
  if (!isFiniteNumber(montant) || montant <= 0) {
    throw new MoneyError('montant-invalide', 'Le montant doit être strictement positif');
  }
  const amountUnits = toUnits(montant, FIAT_DECIMALS);
  if (amountUnits <= 0n) {
    throw new MoneyError('montant-invalide', 'Montant inférieur au centime');
  }
  const fiatUnits = toUnits(soldeFiat, FIAT_DECIMALS);

  if (type === 'depot') {
    return {
      nouveauSoldeFiat: fromUnits(fiatUnits + amountUnits, FIAT_DECIMALS),
      montant: fromUnits(amountUnits, FIAT_DECIMALS),
    };
  }
  if (fiatUnits < amountUnits) {
    throw new MoneyError('solde-insuffisant', 'Le solde serait négatif après ce retrait');
  }
  return {
    nouveauSoldeFiat: fromUnits(fiatUnits - amountUnits, FIAT_DECIMALS),
    montant: fromUnits(amountUnits, FIAT_DECIMALS),
  };
};
