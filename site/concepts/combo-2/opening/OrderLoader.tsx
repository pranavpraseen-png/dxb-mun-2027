// The live site's first screen (owner, 2026-11-06): "for the intro like first loading page put that part only as
// same as alt 1". This is Combo 1's ORDER, ORDER loader, imported unchanged, in place of the typed DXBMUN27 loader.
// When it ends, the opening builds exactly as before (point web, globe, camera swoop, hero text).
// On only when VITE_LOADER=order (the dxbmun-2027 deploy) or ?loader=order (preview); Combo 2 itself is unchanged.
import { useEffect, useState } from 'react';
import '@fontsource-variable/anybody/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import { Loader } from '../../combo-1/Loader';
import { start } from '../../combo-1/kinetic';
import './order-loader.css';

export const ORDER_LOADER =
  import.meta.env.VITE_LOADER === 'order' ||
  (typeof location !== 'undefined' && new URLSearchParams(location.search).get('loader') === 'order');

export function OrderLoader({ onDone }: { onDone: () => void }) {
  const [gone, setGone] = useState(false);
  useEffect(() => { start(); }, []);
  if (gone) return null;
  return <Loader onDone={() => { setGone(true); onDone(); }} />;
}
