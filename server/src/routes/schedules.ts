import { Router } from "express";
import { asStaff, currentUser } from "../middleware/auth.js";
import { getPrisma } from "../prisma.js";
import { forbidden, notFound } from "../services/httpError.js";
import { createSlot, parseSlotTimes } from "../services/slots.js";

export const schedulesRouter = Router();

// BR-05: an advisor can act only on a schedule assigned to them.
async function assignedSchedule(rawId: string, advisorId: number) {
  const id = Number(rawId);
  const schedule = Number.isInteger(id) && id > 0 ? await getPrisma().schedule.findUnique({ where: { id } }) : null;
  if (!schedule) throw notFound("Schedule");
  if (schedule.advisorId !== advisorId) throw forbidden();
  return schedule;
}

schedulesRouter.get("/mine", ...asStaff, async (req, res, next) => {
  try {
    const schedules = await getPrisma().schedule.findMany({
      where: { advisorId: currentUser(req).id },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.json({ schedules });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.post("/:id/slots", ...asStaff, async (req, res, next) => {
  try {
    const schedule = await assignedSchedule(req.params.id, currentUser(req).id);
    const { startAt, endAt } = parseSlotTimes(req.body);
    const slot = await createSlot(schedule.id, startAt, endAt);
    res.status(201).json({ slot: { id: slot.id, scheduleId: slot.scheduleId, startAt: slot.startAt, endAt: slot.endAt } });
  } catch (err) {
    next(err);
  }
});

schedulesRouter.get("/:id/slots", ...asStaff, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schedule = Number.isInteger(id) && id > 0 ? await getPrisma().schedule.findUnique({ where: { id } }) : null;
    if (!schedule) throw notFound("Schedule");
    const slots = await getPrisma().slot.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { startAt: "asc" },
      include: { bookings: { where: { status: "ACTIVE" }, include: { customer: true } } },
    });
    res.json({
      slots: slots.map((slot) => {
        const booking = slot.bookings[0];
        return {
          id: slot.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          booking: booking
            ? { id: booking.id, topic: booking.topic, student: { id: booking.customer.id, name: booking.customer.name } }
            : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});
