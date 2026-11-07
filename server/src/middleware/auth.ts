import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { UserRole } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { SESSION_COOKIE, clearSessionCookie, hashToken } from "../services/session.js";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// An explicit field list, so a password hash can never leak through a response.
export function serializeUser(u: AuthUser): AuthUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    const session = token
      ? await getPrisma().session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
      : null;
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) await getPrisma().session.delete({ where: { id: session.id } }).catch(() => {});
      clearSessionCookie(res);
      return res.status(401).json({ error: "Authentication required.", code: "UNAUTHENTICATED" });
    }
    req.user = serializeUser(session.user);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role: UserRole): RequestHandler {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: "You do not have permission to do that.", code: "FORBIDDEN" });
    }
    next();
  };
}

export const asCustomer = [requireAuth, requireRole("CUSTOMER")];
export const asStaff = [requireAuth, requireRole("STAFF")];

// The session's user. Only call this on a route guarded by requireAuth.
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new Error("currentUser used on an unguarded route");
  return req.user;
}
