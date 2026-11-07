// A person icon whose colour follows the text colour (set it with a class like text-sky-200)
export default function AccountIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="12" cy="8" r="4.2" />
      <path d="M3.5 21c0-4.6 3.8-7 8.5-7s8.5 2.4 8.5 7z" />
    </svg>
  );
}
