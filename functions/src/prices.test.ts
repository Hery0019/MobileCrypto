import { DEFAULT_CRYPTOS, nextPrice } from './prices';

describe('nextPrice', () => {
  it('reste dans la borne de ±2 % et arrondit au centime', () => {
    expect(nextPrice(100, () => 1)).toBe(102);
    expect(nextPrice(100, () => 0)).toBe(98);
    expect(nextPrice(100, () => 0.5)).toBe(100);
  });

  it('ne descend jamais sous 0,01', () => {
    expect(nextPrice(0.01, () => 0)).toBe(0.01);
    expect(nextPrice(0, () => 0.5)).toBe(0.01);
  });

  it('expose un référentiel initial aligné sur les identifiants historiques', () => {
    expect(Object.keys(DEFAULT_CRYPTOS)).toEqual(['1', '2', '3']);
  });
});
