"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { today } from "@/lib/dates";
import { Repartition } from "./Repartition";

export default function RepartitionPage() {
  return (
    <Suspense>
      <AvecDate />
    </Suspense>
  );
}

function AvecDate() {
  const date = useSearchParams().get("date") ?? today();
  return <Repartition date={date} />;
}
