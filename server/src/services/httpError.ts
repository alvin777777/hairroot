// A documented API failure. The error middleware turns it into the standard response body.
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `${what} not found.`);
export const forbidden = () => new HttpError(403, "FORBIDDEN", "You do not have permission to do that.");
export const validation = (fields: Record<string, string>) =>
  new HttpError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", fields);
