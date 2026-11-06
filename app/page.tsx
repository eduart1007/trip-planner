"use client";

import dynamic from "next/dynamic";

// Leaflet needs the browser, so we load it without server rendering
const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <TripMap />
    </main>
  );
}