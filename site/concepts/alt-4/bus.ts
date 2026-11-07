// A tiny event bus between the page (React) and the stage (WebGL + audio).
// 'tap' = a small gavel knock (Register CTA, clicks on the floor). 'gavel' = the big strike. 'ready' = hero revealed.
export type FloorEvent = 'tap' | 'gavel' | 'ready';
const target = new EventTarget();
export const emit = (e: FloorEvent) => target.dispatchEvent(new Event(e));
export const on = (e: FloorEvent, fn: () => void) => {
  target.addEventListener(e, fn);
  return () => target.removeEventListener(e, fn);
};
