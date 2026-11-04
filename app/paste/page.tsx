import { Suspense } from "react";
import PasteView from "@/components/paste/PasteView";

export default function PastePage() {
  return (
    <Suspense>
      <PasteView />
    </Suspense>
  );
}
