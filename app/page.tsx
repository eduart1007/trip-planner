"use client";

import dynamic from "next/dynamic";

// The map needs the browser, so it is loaded without server rendering
const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full items-center justify-center text-sm text-gray-500">
      Loading map…
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-dvh w-screen">
      <TripMap />
    </main>
  );
}
