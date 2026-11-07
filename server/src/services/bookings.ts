import { getPrisma } from "../prisma.js";

const slotView = { include: { schedule: { include: { advisor: true } } } } as const;

export async function listAvailableSlots() {
  return getPrisma().slot.findMany({ ...slotView, orderBy: { startAt: "asc" } });
}

export async function createBooking(customerId: number, slotId: number, topic: string) {
  return getPrisma().booking.create({ data: { customerId, slotId, topic }, include: { slot: slotView } });
}
