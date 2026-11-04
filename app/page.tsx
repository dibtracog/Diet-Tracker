import { Suspense } from "react";
import TodaySkeleton from "@/components/today/TodaySkeleton";
import TodayView from "@/components/today/TodayView";

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayView />
    </Suspense>
  );
}
