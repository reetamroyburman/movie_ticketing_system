export const HOLD_EXPIRY_MINUTES = 10;

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum SeatInventoryStatus {
  AVAILABLE = 'available',
  HELD = 'held',
  BOOKED = 'booked',
}

export enum SeatType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  VIP = 'vip',
}

export enum MovieRating {
  U = 'U',
  UA = 'UA',
  A = 'A',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export const SEAT_PRICE_MULTIPLIERS: Record<string, number> = {
  [SeatType.STANDARD]: 1.0,
  [SeatType.PREMIUM]: 1.5,
  [SeatType.VIP]: 2.0,
};

export const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
