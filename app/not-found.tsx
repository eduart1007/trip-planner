import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Back to the map
      </Link>
    </main>
  );
}
