import { useEffect, useState } from "react";
import { getVersion } from "../api.js";

// Shows which commit the running deployment serves (Lab 5 #45, R-08). Outside GCP the API reports
// no commit, so the footer says "development". If the request fails, the footer stays hidden.
export default function VersionFooter() {
  const [state, setState] = useState<{ commit: string | null } | null>(null);

  useEffect(() => {
    getVersion().then(setState).catch(() => setState(null));
  }, []);

  if (!state) return null;
  return (
    <footer className="text-center small text-body-secondary py-3" data-testid="app-version" title={state.commit ?? undefined}>
      Version {state.commit ? state.commit.slice(0, 7) : "development"}
    </footer>
  );
}
