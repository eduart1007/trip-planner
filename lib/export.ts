import { getLanguage } from "./i18n";
import { DEFAULT_STAY_MINUTES, formatClock, type Schedule } from "./schedule";
import { formatMoney } from "./settings";
import type { Place } from "./types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// A time of day today -> "20261107T091500" (local time, no time zone)
function icsDate(base: Date, seconds: number) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, Math.round(seconds));
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

function escapeText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Calendar files want lines of at most 75 characters
function fold(line: string) {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 70) parts.push(line.slice(i, i + 70));
  return parts.join("\r\n ");
}

// One calendar event per stop, from arrival to departure
export function buildIcs(stops: Place[], schedule: Schedule): string {
  const today = new Date();
  const stamp = today.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Trip Planner//EN", "CALSCALE:GREGORIAN"];

  stops.forEach((stop, i) => {
    const item = schedule.items[i];
    const description = [
      stop.note,
      ...(stop.checklist ?? []).map((c) => `${c.done ? "[x]" : "[ ]"} ${c.text}`),
      stop.cost ? formatMoney(stop.cost) : "",
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${stamp}-${i}-${stop.id}@trip-planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(today, item.arriveAt)}`,
      `DTEND:${icsDate(today, item.departAt)}`,
      `SUMMARY:${escapeText(`${i + 1}. ${stop.name}`)}`,
      `LOCATION:${escapeText(stop.address ?? stop.name)}`,
      `GEO:${stop.lat};${stop.lon}`
    );
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type PrintLabels = {
  title: string;
  arrive: string;
  leave: string;
  stay: string;
  budget: string;
  total: string;
};

// Opens a clean page of the plan and starts printing (choose "Save as PDF" to get a PDF)
export function printTrip(stops: Place[], schedule: Schedule, labels: PrintLabels): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;

  const total = stops.reduce((sum, s) => sum + (s.cost ?? 0), 0);

  const sections = stops
    .map((stop, i) => {
      const item = schedule.items[i];
      const checklist = (stop.checklist ?? [])
        .map((c) => `<li>${c.done ? "☑" : "☐"} ${esc(c.text)}</li>`)
        .join("");
      return `<section>
        <h2>${i + 1}. ${esc(stop.name)}</h2>
        <p class="times">${esc(labels.arrive)} ${formatClock(item.arriveAt)} · ${esc(labels.leave)} ${formatClock(
          item.departAt
        )} · ${esc(labels.stay)} ${stop.stayMinutes ?? DEFAULT_STAY_MINUTES} min</p>
        ${stop.address ? `<p class="muted">${esc(stop.address)}</p>` : ""}
        ${stop.note ? `<p>${esc(stop.note).replace(/\n/g, "<br>")}</p>` : ""}
        ${checklist ? `<ul>${checklist}</ul>` : ""}
        ${stop.cost ? `<p>${esc(labels.budget)}: ${esc(formatMoney(stop.cost))}</p>` : ""}
      </section>`;
    })
    .join("");

  win.document.write(`<!doctype html>
<html lang="${getLanguage()}">
<head>
<meta charset="utf-8">
<title>${esc(labels.title)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; color: #111; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; margin: 0 0 4px; }
  section { border-top: 1px solid #ddd; padding: 12px 0; break-inside: avoid; }
  .times { font-weight: 600; margin: 0 0 4px; }
  .muted { color: #666; margin: 0 0 4px; }
  ul { list-style: none; padding: 0; margin: 4px 0; }
</style>
</head>
<body>
<h1>${esc(labels.title)}</h1>
${sections}
${total > 0 ? `<p><strong>${esc(labels.total)}: ${esc(formatMoney(total))}</strong></p>` : ""}
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
