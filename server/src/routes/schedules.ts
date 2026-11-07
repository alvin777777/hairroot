import { Router } from "express";
import { asStaff, currentUser } from "../middleware/auth.js";
import { getPrisma } from "../prisma.js";
import { notFound } from "../services/httpError.js";
import { createSlot, parseSlotTimes } from "../services/slots.js";

export const schedulesRouter = Router();

schedulesRouter.get("/mine", asStaff, async (req, res, next) => {
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

schedulesRouter.post("/:id/slots", asStaff, async (req, res, next) => {
  try {
    const schedule = await getPrisma().schedule.findUnique({ where: { id: Number(req.params.id) || 0 } });
    if (!schedule) throw notFound("Schedule");
    const { startAt, endAt } = parseSlotTimes(req.body);
    const slot = await createSlot(schedule.id, startAt, endAt);
    res.status(201).json({ slot: { id: slot.id, scheduleId: slot.scheduleId, startAt: slot.startAt, endAt: slot.endAt } });
  } catch (err) {
    next(err);
  }
});
