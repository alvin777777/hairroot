import { FormEvent, useEffect, useState } from "react";
import { ApiError, Schedule, bangkokToIso, createSlot, getMySchedules } from "../api.js";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMySchedules()
      .then((r) => {
        setSchedules(r.schedules);
        setScheduleId(r.schedules[0]?.id ?? null);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (scheduleId === null) return;
    setFields({});
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await createSlot(scheduleId, bangkokToIso(startAt), bangkokToIso(endAt));
      setStartAt("");
      setEndAt("");
      setNotice("Slot created.");
    } catch (err) {
      setFields(err instanceof ApiError ? err.fields : {});
      setError(err instanceof Error ? err.message : "Unable to create the slot.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <div className="alert alert-danger" role="alert">{loadError}</div>;
  if (!schedules) return <p className="text-body-secondary" role="status">Loading schedules…</p>;
  if (schedules.length === 0) return <p>No schedules are assigned to you yet.</p>;

  return (
    <>
      <h1 className="h4 mb-3">My schedule</h1>
      <div className="mb-3" style={{ maxWidth: 420 }}>
        <label htmlFor="schedule" className="form-label">Schedule</label>
        <select id="schedule" className="form-select" value={scheduleId ?? ""} onChange={(e) => setScheduleId(Number(e.target.value))}>
          {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <section className="card mb-4" style={{ maxWidth: 640 }}>
        <div className="card-body">
          <h2 className="h6">Add an available time</h2>
          {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
          {notice && <div className="alert alert-success py-2" role="status">{notice}</div>}
          <form onSubmit={onCreate} noValidate className="row g-2">
            <div className="col-sm-6">
              <label htmlFor="startAt" className="form-label">Start (Bangkok time)</label>
              <input id="startAt" type="datetime-local" className={`form-control ${fields.startAt ? "is-invalid" : ""}`}
                value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              {fields.startAt && <div className="invalid-feedback">{fields.startAt}</div>}
            </div>
            <div className="col-sm-6">
              <label htmlFor="endAt" className="form-label">End (Bangkok time)</label>
              <input id="endAt" type="datetime-local" className={`form-control ${fields.endAt ? "is-invalid" : ""}`}
                value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              {fields.endAt && <div className="invalid-feedback">{fields.endAt}</div>}
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Add slot"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
