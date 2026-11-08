"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-gray-600">
        Your plan is saved on this device. Try again, and if it keeps happening, reload the page.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </main>
  );
}
