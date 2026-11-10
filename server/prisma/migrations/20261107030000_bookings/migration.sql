CREATE TYPE "BookingStatus" AS ENUM ('ACTIVE');

CREATE TABLE "Booking" (
    "id" SERIAL PRIMARY KEY,
    "slotId" INTEGER NOT NULL REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "customerId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "topic" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");
