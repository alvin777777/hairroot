import { Router } from "express";
import { asCustomer, currentUser } from "../middleware/auth.js";
import { createBooking, listAvailableSlots, parseBookingInput } from "../services/bookings.js";

export const slotsRouter = Router();
export const bookingsRouter = Router();

type SlotRow = Awaited<ReturnType<typeof listAvailableSlots>>[number];

export function serializeSlot(slot: SlotRow) {
  return {
    id: slot.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    scheduleName: slot.schedule.name,
    advisorName: slot.schedule.advisor.name,
  };
}

slotsRouter.get("/available", ...asCustomer, async (_req, res, next) => {
  try {
    res.json({ slots: (await listAvailableSlots()).map(serializeSlot) });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post("/", ...asCustomer, async (req, res, next) => {
  try {
    // BR-07: the owner always comes from the session, whatever the body contains.
    const { slotId, topic } = parseBookingInput(req.body);
    const booking = await createBooking(currentUser(req).id, slotId, topic);
    res.status(201).json({
      booking: {
        id: booking.id,
        status: booking.status,
        topic: booking.topic,
        createdAt: booking.createdAt,
        slot: serializeSlot(booking.slot),
      },
    });
  } catch (err) {
    next(err);
  }
});
