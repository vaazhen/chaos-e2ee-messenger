import { useEffect, useState } from "react";

/** Returns current time (ms), updated every `intervalMs` while `active` is true. */
export default function useNowTicker(active, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
