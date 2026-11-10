import { Router } from "express";
import { asCustomer, currentUser } from "../middleware/auth.js";
import { createBooking, getOwnedBooking, listAvailableSlots, listBookings, parseBookingInput } from "../services/bookings.js";
import { notFound } from "../services/httpError.js";

export const slotsRouter = Router();
export const bookingsRouter = Router();

type SlotRow = Awaited<ReturnType<typeof listAvailableSlots>>[number];

export function serializeSlot(slot: SlotRow) {
  return {
    id: slot.id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    scheduleName: slot.schedule.name,
    specialistName: slot.schedule.specialist.name,
  };
}

type BookingRow = Awaited<ReturnType<typeof createBooking>>;

function serializeBooking(booking: BookingRow) {
  return {
    id: booking.id,
    status: booking.status,
    topic: booking.topic,
    createdAt: booking.createdAt,
    slot: serializeSlot(booking.slot),
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
    res.status(201).json({ booking: serializeBooking(booking) });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/mine", ...asCustomer, async (req, res, next) => {
  try {
    res.json({ bookings: (await listBookings(currentUser(req).id)).map(serializeBooking) });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get("/:id", ...asCustomer, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const booking = Number.isInteger(id) && id > 0 ? await getOwnedBooking(id, currentUser(req).id) : null;
    if (!booking) throw notFound("Booking");
    res.json({ booking: serializeBooking(booking) });
  } catch (err) {
    next(err);
  }
});
