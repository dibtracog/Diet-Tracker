"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current date once the component has mounted in the browser.
 * Returns null during server rendering so dates always use the phone's own
 * time zone and never cause hydration mismatches.
 */
export function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
  }, []);
  return today;
}
