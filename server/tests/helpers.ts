import request from "supertest";
import type { UserRole } from "@prisma/client";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/services/password.js";

export const PASSWORD = "Password123!";
export const ORIGIN = "http://localhost:5173";
const passwordHash = hashPassword(PASSWORD);

// Every state-changing request must present the client's Origin, so tests go through api().
export function api() {
  const r = request(app);
  for (const method of ["post", "put", "patch", "delete"] as const) {
    const original = r[method].bind(r);
    (r as unknown as Record<string, unknown>)[method] = (url: string) => original(url).set("Origin", ORIGIN);
  }
  return r;
}

export async function resetDb() {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  if (tables) await prisma.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export async function createUser(role: UserRole, email: string, name = email) {
  return getPrisma().user.create({ data: { email, name, role, passwordHash: await passwordHash } });
}

export function cookieFrom(res: request.Response): string {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  if (!header?.[0]) throw new Error(`no Set-Cookie header (status ${res.status})`);
  return header[0].split(";")[0];
}

export async function loginAs(email: string): Promise<string> {
  const res = await api().post("/api/auth/login").send({ email, password: PASSWORD });
  return cookieFrom(res);
}
