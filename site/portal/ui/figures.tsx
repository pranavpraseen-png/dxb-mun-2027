// Timer digits that never shift as they count. Mona Sans's fixed-width figures draw a slashed zero, so the
// timers use its plain figures and give each digit a fixed slot instead (`.fig` in theme.css).
// The text content stays exactly the clock string, so tests that read textContent still work.
export function Clock({ text }: { text: string }) {
  return <>{[...text].map((ch, i) => (/\d/.test(ch) ? <span key={i} className="fig">{ch}</span> : <span key={i} className="fig-sep">{ch}</span>))}</>;
}
