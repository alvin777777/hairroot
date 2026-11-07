import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { HttpError, validation } from "../services/httpError.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  deleteSessionByToken,
  setSessionCookie,
} from "../services/session.js";
import { requireAuth, serializeUser } from "../middleware/auth.js";

export const authRouter = Router();

// Verifying against this for unknown emails keeps response timing the same as for a real user.
const dummyHash = hashPassword("not-a-real-account-password");

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const fields: Record<string, string> = {};
    if (!email) fields.email = "Email is required.";
    if (!password) fields.password = "Password is required.";
    if (Object.keys(fields).length > 0) throw validation(fields);

    const user = await getPrisma().user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
    if (!user || !valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    setSessionCookie(res, await createSession(user.id));
    res.status(200).json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (token) await deleteSessionByToken(token);
    clearSessionCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});
