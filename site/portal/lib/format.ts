// Dates and times in Dubai time. Unknown (null) always reads "To be announced".
export const TBA = 'To be announced';

const ok = (iso: string | null | undefined): iso is string => !!iso && !Number.isNaN(Date.parse(iso));

/** "14:30" */
export function timeOf(iso: string | null | undefined): string {
  if (!ok(iso)) return TBA;
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
}

/** "Thu 5 Nov, 14:30" */
export function dayTime(iso: string | null | undefined): string {
  if (!ok(iso)) return TBA;
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
}

/** "Thu 5 Nov" */
export function dayOf(iso: string | null | undefined): string {
  if (!ok(iso)) return TBA;
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' });
}

/** "1st", "2nd", "3rd", "4th" … */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "12 KB", "1.4 MB" */
export function sizeText(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Opens a URL from the API in a new tab without the pop-up blocker eating it: the tab opens on the click. */
export async function openInNewTab(getUrl: () => Promise<string>): Promise<void> {
  const w = window.open('about:blank', '_blank');
  try {
    const url = await getUrl();
    if (w) { w.opener = null; w.location.href = url; } else window.open(url, '_blank', 'noopener');
  } catch (e) {
    w?.close();
    throw e;
  }
}
