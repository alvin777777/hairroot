-- BR-01: at most one active booking per slot. The database decides competing requests.
CREATE UNIQUE INDEX "booking_one_active_per_slot" ON "Booking" ("slotId") WHERE "status" = 'ACTIVE';
