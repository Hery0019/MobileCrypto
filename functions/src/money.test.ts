import { computeCashMovement, computeOrder, MoneyError } from './money';

const expectMoneyError = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(MoneyError);
    expect((error as MoneyError).code).toBe(code);
    return;
  }
  throw new Error(`attendu MoneyError(${code})`);
};

describe('computeOrder', () => {
  it('débite le fiat et crédite la crypto sur un achat', () => {
    const r = computeOrder({ type: 'achat', quantite: 0.5, prixUnitaire: 6000, soldeFiat: 10000, soldeCrypto: 0 });
    expect(r).toEqual({ nouveauSoldeFiat: 7000, nouveauSoldeCrypto: 0.5, montantTotal: 3000 });
  });

  it('crédite le fiat et débite la crypto sur une vente', () => {
    const r = computeOrder({ type: 'vente', quantite: 0.25, prixUnitaire: 4000, soldeFiat: 100, soldeCrypto: 1 });
    expect(r).toEqual({ nouveauSoldeFiat: 1100, nouveauSoldeCrypto: 0.75, montantTotal: 1000 });
  });

  it('ne dérive pas en flottant sur des opérations répétées', () => {
    let soldeFiat = 1000;
    let soldeCrypto = 0;
    for (let i = 0; i < 1000; i++) {
      const r = computeOrder({ type: 'achat', quantite: 0.1, prixUnitaire: 0.3, soldeFiat, soldeCrypto });
      soldeFiat = r.nouveauSoldeFiat;
      soldeCrypto = r.nouveauSoldeCrypto;
    }
    expect(soldeCrypto).toBe(100);
    expect(soldeFiat).toBe(970);
  });

  it('refuse un total nul après arrondi au centime', () => {
    // 1e-8 × 6000 = 0.00006 $ → 0 centime
    expectMoneyError(
      () => computeOrder({ type: 'achat', quantite: 0.00000001, prixUnitaire: 6000, soldeFiat: 10, soldeCrypto: 0 }),
      'quantite-invalide'
    );
  });

  it("refuse un achat au-delà du solde, même d'un centime", () => {
    expectMoneyError(
      () => computeOrder({ type: 'achat', quantite: 1, prixUnitaire: 100.01, soldeFiat: 100, soldeCrypto: 0 }),
      'solde-insuffisant'
    );
  });

  it('accepte un achat qui vide exactement le solde', () => {
    const r = computeOrder({ type: 'achat', quantite: 1, prixUnitaire: 100, soldeFiat: 100, soldeCrypto: 0 });
    expect(r.nouveauSoldeFiat).toBe(0);
  });

  it('refuse une vente au-delà de la crypto détenue', () => {
    expectMoneyError(
      () => computeOrder({ type: 'vente', quantite: 1.00000001, prixUnitaire: 100, soldeFiat: 0, soldeCrypto: 1 }),
      'crypto-insuffisante'
    );
  });

  it('accepte de vendre exactement tout ce qui est détenu (0.1+0.2)', () => {
    const solde = 0.1 + 0.2; // 0.30000000000000004 en flottant
    const r = computeOrder({ type: 'vente', quantite: 0.3, prixUnitaire: 10, soldeFiat: 0, soldeCrypto: solde });
    expect(r.nouveauSoldeCrypto).toBe(0);
    expect(r.nouveauSoldeFiat).toBe(3);
  });

  it.each([0, -1, NaN, Infinity])('refuse la quantité %p', (quantite) => {
    expectMoneyError(
      () => computeOrder({ type: 'achat', quantite, prixUnitaire: 10, soldeFiat: 100, soldeCrypto: 0 }),
      'quantite-invalide'
    );
  });

  it('refuse un prix absent ou nul', () => {
    expectMoneyError(
      () => computeOrder({ type: 'achat', quantite: 1, prixUnitaire: 0, soldeFiat: 100, soldeCrypto: 0 }),
      'prix-invalide'
    );
  });

  it('gère de grands montants sans dépassement', () => {
    const r = computeOrder({ type: 'achat', quantite: 1_000_000, prixUnitaire: 100_000, soldeFiat: 1e12, soldeCrypto: 0 });
    expect(r.montantTotal).toBe(1e11);
    expect(r.nouveauSoldeFiat).toBe(9e11);
  });
});

describe('computeCashMovement', () => {
  it('crédite un dépôt', () => {
    expect(computeCashMovement({ type: 'depot', montant: 50.5, soldeFiat: 10 })).toEqual({
      nouveauSoldeFiat: 60.5,
      montant: 50.5,
    });
  });

  it('débite un retrait', () => {
    expect(computeCashMovement({ type: 'retrait', montant: 10, soldeFiat: 10 })).toEqual({
      nouveauSoldeFiat: 0,
      montant: 10,
    });
  });

  it('refuse un retrait qui rendrait le solde négatif', () => {
    expectMoneyError(() => computeCashMovement({ type: 'retrait', montant: 10.01, soldeFiat: 10 }), 'solde-insuffisant');
  });

  it.each([0, -5, NaN, 0.001])('refuse le montant %p', (montant) => {
    expectMoneyError(() => computeCashMovement({ type: 'depot', montant, soldeFiat: 0 }), 'montant-invalide');
  });
});
