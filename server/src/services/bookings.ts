import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { HttpError, notFound, validation } from "./httpError.js";

const slotView = { include: { schedule: { include: { advisor: true } } } } as const;

export const MIN_TOPIC = 3;
export const MAX_TOPIC = 200;

// BR-02 and BR-06: future slots with no active booking. Nothing about any booking is selected.
export async function listAvailableSlots(now = new Date()) {
  return getPrisma().slot.findMany({
    ...slotView,
    where: { startAt: { gt: now }, bookings: { none: { status: "ACTIVE" } } },
    orderBy: { startAt: "asc" },
  });
}

export function parseBookingInput(body: { slotId?: unknown; topic?: unknown } | undefined) {
  const fields: Record<string, string> = {};
  const slotId = body?.slotId;
  if (typeof slotId !== "number" || !Number.isInteger(slotId) || slotId <= 0) fields.slotId = "Choose a slot.";
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  if (topic.length < MIN_TOPIC || topic.length > MAX_TOPIC) {
    fields.topic = `Enter a topic of ${MIN_TOPIC} to ${MAX_TOPIC} characters.`;
  }
  if (Object.keys(fields).length > 0) throw validation(fields);
  return { slotId: slotId as number, topic };
}

export async function createBooking(customerId: number, slotId: number, topic: string, now = new Date()) {
  const prisma = getPrisma();
  const slot = await prisma.slot.findUnique({ where: { id: slotId }, select: { startAt: true } });
  if (!slot) throw notFound("Slot");
  if (slot.startAt.getTime() <= now.getTime()) {
    throw new HttpError(422, "SLOT_NOT_BOOKABLE", "This time has already started and can no longer be booked.");
  }
  try {
    return await prisma.booking.create({ data: { customerId, slotId, topic }, include: { slot: slotView } });
  } catch (err) {
    // booking_one_active_per_slot rejected the insert: another student holds this slot (BR-01).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "SLOT_TAKEN", "Another student has just taken this time.");
    }
    throw err;
  }
}
