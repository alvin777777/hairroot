import express, { type NextFunction, type Request, type Response } from "express";
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

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found.", code: "NOT_FOUND" });
});

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
