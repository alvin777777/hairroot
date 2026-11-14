import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBookingPopularity, PopularityDay } from "../api.js";
import { useAuth } from "../context/AuthContext.js";

function HairPortrait({ strands }: { strands: number }) {
  const visibleStrands = Math.min(strands, 28);
  const paths = Array.from({ length: visibleStrands }, (_, index) => {
    const x = 44 + (index % 14) * 5.5;
    const row = Math.floor(index / 14);
    const y = 47 + row * 8 + Math.abs(6.5 - (index % 14)) * 1.2;
    const height = 11 + (index % 4) * 3;
    return `M ${x} ${y + 8} Q ${x - 2} ${y - 2} ${x + 2} ${y - height}`;
  });

  return (
    <svg className="hair-portrait" viewBox="0 0 160 190" role="img" aria-label={`${Math.min(strands, 28)} visible hair strands for ${strands} upcoming bookings`}>
      <path d="M39 84c0-35 17-55 41-55s41 20 41 55v38c0 24-18 43-41 43s-41-19-41-43V84Z" fill="#f4c9a8" />
      <path d="M38 89c-11-2-13 16-5 24l8 4M122 89c11-2 13 16 5 24l-8 4" fill="#f4c9a8" stroke="#d79d7e" strokeWidth="2" />
      <path d="M58 103h8M94 103h8M72 127q8 6 16 0" fill="none" stroke="#594a45" strokeLinecap="round" strokeWidth="3" />
      <path d="M46 76c3-27 15-39 34-39s31 12 34 39" fill="none" stroke="#6b4a37" strokeLinecap="round" strokeWidth="3" />
      {paths.map((path, index) => <path key={index} data-testid="hair-strand" d={path} fill="none" stroke="#4b3428" strokeLinecap="round" strokeWidth="2.7" />)}
      <path d="M55 167q25 14 50 0l16 18H39l16-18Z" fill="#397b72" />
    </svg>
  );
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00+07:00`));
}

export default function HomePage() {
  const { user } = useAuth();
  const [days, setDays] = useState<PopularityDay[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const totalBookings = days?.reduce((sum, day) => sum + day.bookings, 0) ?? 0;
  const busiest = Math.max(1, ...(days?.map((day) => day.bookings) ?? [0]));
  const destination = user?.role === "STAFF" ? "/schedule" : user?.role === "CUSTOMER" ? "/slots" : "/login";

  useEffect(() => {
    getBookingPopularity()
      .then((response) => setDays(response.days))
      .catch(() => setLoadError(true));
  }, []);

  return (
    <main className="container py-4 py-md-5">
      <nav className="d-flex justify-content-between align-items-center mb-5" aria-label="Main navigation">
        <span className="navbar-brand mb-0 fw-semibold">HairRoot</span>
        <Link to={destination} className="btn btn-outline-primary">{user ? "Open dashboard" : "Sign in"}</Link>
      </nav>

      <section className="row align-items-center g-4 g-lg-5 mb-5">
        <div className="col-12 col-md-6">
          <p className="text-uppercase small fw-semibold text-primary mb-2">A little more growth, together</p>
          <h1 className="display-5 fw-semibold">See the clinic’s week take shape.</h1>
          <p className="lead text-body-secondary">Each upcoming booking adds a strand. Check the rhythm of the week before choosing a time that works for you.</p>
          <Link to={destination} className="btn btn-primary btn-lg mt-2">{user?.role === "STAFF" ? "View my schedule" : "Find a time"}</Link>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm text-center p-3 p-md-4">
            <HairPortrait strands={totalBookings} />
            <h2 className="h5 mb-1">{days ? `${totalBookings} upcoming ${totalBookings === 1 ? "booking" : "bookings"}` : "The week is growing"}</h2>
            <p className="small text-body-secondary mb-0">One strand per booking, up to 28 strands shown. Counts cover the next seven days.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="week-title" className="card border-0 bg-body-tertiary p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-3">
          <div>
            <h2 id="week-title" className="h4 mb-1">This week at a glance</h2>
            <p className="text-body-secondary mb-0">A private, anonymous count of booked times by day.</p>
          </div>
          {days && <span className="badge text-bg-light">{totalBookings ? `Busiest: ${formatDay(days.reduce((best, day) => day.bookings > best.bookings ? day : best, days[0]).date)}` : "No bookings yet"}</span>}
        </div>
        {loadError && <p className="alert alert-warning mb-0" role="status">This week’s booking activity is temporarily unavailable.</p>}
        {!days && !loadError && <p className="text-body-secondary mb-0" role="status">Loading this week’s activity…</p>}
        {days && (
          <div className="row g-2" aria-label="Bookings by day">
            {days.map((day) => (
              <div className="col-6 col-sm-4 col-lg" key={day.date}>
                <div className="rounded bg-white border p-3 h-100">
                  <div className="small text-body-secondary">{formatDay(day.date)}</div>
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <div className="progress flex-grow-1" role="progressbar" aria-label={`${formatDay(day.date)} bookings`} aria-valuenow={day.bookings} aria-valuemin={0} aria-valuemax={busiest}>
                      <div className="progress-bar bg-success" style={{ width: `${day.bookings / busiest * 100}%` }} />
                    </div>
                    <span className="fw-semibold">{day.bookings}</span>
                  </div>
                  <div className="small text-body-secondary mt-1">{day.bookings === 1 ? "booking" : "bookings"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="small text-body-secondary mt-3 mb-0">Counts include booked appointments only. Names and appointment details stay private.</p>
    </main>
  );
}
