import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api.js";
import { roleHome, useAuth } from "../context/AuthContext.js";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to={roleHome(user.role)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);
    try {
      const next = await login(email, password);
      navigate(roleHome(next.role));
    } catch (err) {
      setFields(err instanceof ApiError ? err.fields : {});
      setError(err instanceof ApiError ? err.message : "Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-5" style={{ maxWidth: 420 }}>
      <h1 className="h3 mb-1">HairRoot</h1>
      <p className="text-body-secondary">Sign in to book or manage hair clinic appointments.</p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input id="email" type="email" autoComplete="username" className={`form-control ${fields.email ? "is-invalid" : ""}`}
            value={email} onChange={(e) => setEmail(e.target.value)} />
          {fields.email && <div className="invalid-feedback">{fields.email}</div>}
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className={`form-control ${fields.password ? "is-invalid" : ""}`}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {fields.password && <div className="invalid-feedback">{fields.password}</div>}
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
