import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { HttpError, notFound, validation } from "./httpError.js";

const slotView = { include: { schedule: { include: { specialist: true } } } } as const;

export const MIN_TOPIC = 3;
export const MAX_TOPIC = 200;
// The Emoji property also includes plain ASCII digits, # and * as keycap bases.
// Allow those characters alone, but reject actual keycaps and emoji-capable symbols.
const emojiCodePoint = /\p{Emoji}/u;
const plainKeycapBase = /^[0-9#*]$/u;

function containsEmoji(topic: string) {
  return Array.from(topic).some((character) =>
    character === "\u20E3" || (emojiCodePoint.test(character) && !plainKeycapBase.test(character))
  );
}

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
  // String.length counts UTF-16 code units; count Unicode code points for the topic rule.
  const topicLength = Array.from(topic).length;
  if (containsEmoji(topic)) {
    fields.topic = "Topics cannot contain emoji.";
  } else if (topicLength < MIN_TOPIC || topicLength > MAX_TOPIC) {
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
    // booking_one_active_per_slot rejected the insert: another customer holds this slot (BR-01).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "SLOT_TAKEN", "Another customer has just taken this time.");
    }
    throw err;
  }
}

export async function listBookings(customerId: number) {
  return getPrisma().booking.findMany({
    where: { customerId },
    include: { slot: slotView },
    orderBy: { slot: { startAt: "asc" } },
  });
}

// BR-06: scoped by owner, so another customer's booking looks exactly like a missing one.
export async function getOwnedBooking(id: number, customerId: number) {
  return getPrisma().booking.findFirst({ where: { id, customerId }, include: { slot: slotView } });
}

const CANCELLATION_NOTICE_MS = 24 * 60 * 60 * 1000;

export async function cancelOwnedBooking(id: number, customerId: number, now = new Date()) {
  const prisma = getPrisma();
  const booking = await getOwnedBooking(id, customerId);
  if (!booking) throw notFound("Booking");
  if (booking.status !== "ACTIVE") {
    throw new HttpError(409, "BOOKING_NOT_ACTIVE", "This booking is no longer active.");
  }
  if (booking.slot.startAt.getTime() - now.getTime() < CANCELLATION_NOTICE_MS) {
    throw new HttpError(422, "CANCELLATION_CLOSED", "Bookings can be cancelled until 24 hours before the appointment.");
  }

  // A conditional write ensures only one competing request can make this transition.
  const changed = await prisma.booking.updateMany({
    where: { id, customerId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });
  if (changed.count !== 1) {
    throw new HttpError(409, "BOOKING_NOT_ACTIVE", "This booking is no longer active.");
  }
  return prisma.booking.findUniqueOrThrow({ where: { id }, include: { slot: slotView } });
}
