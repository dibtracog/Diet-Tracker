"use client";

import { useToday } from "@/lib/useToday";

export default function TodayDate({ part = "full" }: { part?: "full" | "weekday" | "date" }) {
  const today = useToday();
  if (!today) return <span>&nbsp;</span>;
  const opts: Intl.DateTimeFormatOptions =
    part === "weekday"
      ? { weekday: "long" }
      : part === "date"
        ? { day: "numeric", month: "long" }
        : { weekday: "long", day: "numeric", month: "long" };
  return <span>{today.toLocaleDateString("en-IN", opts)}</span>;
}
