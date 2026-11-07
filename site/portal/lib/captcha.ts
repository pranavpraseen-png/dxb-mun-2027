// Bot check for "Email me a code": Cloudflare Turnstile, switched on by VITE_TURNSTILE_SITE_KEY (a public key).
// Supabase checks the token server-side once "Enable CAPTCHA protection" is on (Auth > Attack Protection) with the
// matching secret. Without the site key nothing loads and sendCode gets no token, as before.
// The widget is "interaction-only": most people never see it; it only shows a box when Cloudflare is unsure.
import { useCallback, useEffect, useRef } from 'react';

type Turnstile = {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

export const CAPTCHA_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loading: Promise<Turnstile> | null = null;
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC; s.async = true; s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Bot check failed to load.')));
    s.onerror = () => { loading = null; reject(new Error("The robot check couldn't load. Check your connection and try again.")); };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Renders the widget into `ref` and hands out one fresh token per call to `token()` (tokens are single use).
 * Returns undefined when the bot check is off.
 */
export function useCaptcha() {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: Turnstile; id: string } | null>(null);
  const current = useRef<string | null>(null);
  const waiters = useRef<((t: string) => void)[]>([]);

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !ref.current) return;
    let alive = true;
    const el = ref.current;
    loadTurnstile().then((api) => {
      if (!alive) return;
      const id = api.render(el, {
        sitekey: CAPTCHA_SITE_KEY,
        appearance: 'interaction-only',
        theme: 'dark',
        'refresh-expired': 'auto',
        callback: (t: string) => { current.current = t; const w = waiters.current; waiters.current = []; w.forEach((f) => f(t)); },
        'expired-callback': () => { current.current = null; },
      });
      widget.current = { api, id };
    }).catch((e) => console.error('[captcha]', e));
    return () => { alive = false; if (widget.current) { widget.current.api.remove(widget.current.id); widget.current = null; } };
  }, []);

  const token = useCallback(async (): Promise<string | undefined> => {
    if (!CAPTCHA_SITE_KEY) return undefined;
    const t = current.current ?? await new Promise<string>((resolve, reject) => {
      waiters.current.push(resolve);
      setTimeout(() => reject(new Error("The robot check is taking a while. Wait a moment and try again.")), 20000);
    });
    current.current = null;
    if (widget.current) widget.current.api.reset(widget.current.id); // the next send gets a fresh token
    return t;
  }, []);

  return { ref, token, on: !!CAPTCHA_SITE_KEY };
}
