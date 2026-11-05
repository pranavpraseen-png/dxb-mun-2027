// When a screen opens: jump to the section named in the route (#/me/consent) and move focus there,
// or put focus on the page heading, so keyboard and screen-reader users land in the right place.
import { useEffect, useRef } from 'react';
import { useRoute } from './route';

let firstScreen = true;

export function useArrival(ready: boolean) {
  const route = useRoute();
  const done = useRef<object | null>(null);
  useEffect(() => {
    if (!ready || done.current === route) return;
    done.current = route;
    const isFirst = firstScreen;
    firstScreen = false;
    if (route.section) {
      const el = document.getElementById(route.section);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        const target = el.querySelector<HTMLElement>('h2, h3') ?? el;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        return;
      }
    }
    window.scrollTo(0, 0);
    if (!isFirst) document.querySelector<HTMLElement>('#main h1')?.focus({ preventScroll: true });
  }, [ready, route]);
}
