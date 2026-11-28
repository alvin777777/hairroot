-- F-06 retains cancelled bookings while the existing partial unique index
-- continues to reserve each slot only for ACTIVE bookings.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
