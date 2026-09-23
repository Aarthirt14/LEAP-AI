import { Suspense } from "react";
import { LeapApp } from "@/components/leap-app";

export default function PathwayDetailPage() {
  return (
    <Suspense fallback={null}>
      <LeapApp />
    </Suspense>
  );
}
