import { existsSync } from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { getPrisma } from "./prisma.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { csrfOriginCheck, allowedOrigin } from "./middleware/csrf.js";
import { authRouter } from "./routes/auth.js";
import { schedulesRouter } from "./routes/schedules.js";
import { bookingsRouter, slotsRouter } from "./routes/bookings.js";
import { HttpError } from "./services/httpError.js";

// Exported separately from listen() so Supertest can use the app without opening a port.
export const app = express();

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(cors({ origin: allowedOrigin(), credentials: true }));
app.use(csrfOriginCheck);
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/slots", slotsRouter);
app.use("/api/bookings", bookingsRouter);

// Liveness: the process is up. Readiness: the database answers. The smoke test and Cloud Run use these.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/ready", async (_req, res) => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found.", code: "NOT_FOUND" });
});

// In the production image the API also serves the built UI from one container (Lab 5).
const clientDist = path.resolve(process.env.CLIENT_DIST ?? path.join(process.cwd(), "../client/dist"));
if (existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist, { index: false }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// Every failure leaves through here, so internal details never reach the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, ...(err.fields ? { fields: err.fields } : {}) });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Malformed JSON.", code: "VALIDATION_ERROR" });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong.", code: "INTERNAL_ERROR" });
});
