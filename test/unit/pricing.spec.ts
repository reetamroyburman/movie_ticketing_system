import { SEAT_PRICE_MULTIPLIERS, SeatType } from '../../src/config/constants';

describe('Pricing Calculation', () => {
  const basePrice = 200;

  it('standard seat = basePrice × 1.0', () => {
    const price = basePrice * SEAT_PRICE_MULTIPLIERS[SeatType.STANDARD];
    expect(price).toBe(200);
  });

  it('premium seat = basePrice × 1.5', () => {
    const price = basePrice * SEAT_PRICE_MULTIPLIERS[SeatType.PREMIUM];
    expect(price).toBe(300);
  });

  it('vip seat = basePrice × 2.0', () => {
    const price = basePrice * SEAT_PRICE_MULTIPLIERS[SeatType.VIP];
    expect(price).toBe(400);
  });

  it('all seat types have defined multipliers', () => {
    Object.values(SeatType).forEach((type) => {
      expect(SEAT_PRICE_MULTIPLIERS[type]).toBeDefined();
      expect(SEAT_PRICE_MULTIPLIERS[type]).toBeGreaterThan(0);
    });
  });

  it('multipliers are in ascending order: standard < premium < vip', () => {
    expect(SEAT_PRICE_MULTIPLIERS[SeatType.STANDARD])
      .toBeLessThan(SEAT_PRICE_MULTIPLIERS[SeatType.PREMIUM]);
    expect(SEAT_PRICE_MULTIPLIERS[SeatType.PREMIUM])
      .toBeLessThan(SEAT_PRICE_MULTIPLIERS[SeatType.VIP]);
  });
});
