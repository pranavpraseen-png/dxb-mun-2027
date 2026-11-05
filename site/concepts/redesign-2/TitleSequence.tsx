import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { conference, heroPhoto, stats, tba } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { SCROLL_FEEL } from '@/shared/scroll';
import { register, signIn } from './links';
import { Button } from '../../portal/ui/coss/button';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const BTN = 'h-12 sm:h-12 px-6 text-[14px] sm:text-[14px] font-semibold tracking-[0.14em] rounded-[2px]';

/*
  The title sequence, like the opening of a film.
  INTRO (time, ~2.6s, once): hairlines draw the frame, the host credit fades up, "DXB MUN" rises letter by letter
    (Mat Voyce: chars from 120% below a mask, random tilt ±12°, back.out(1.7), 0.03s stagger), a thin slit opens
    between the title lines with the photo inside, "2027" rises, then the meta row.
  SCROLL (sticky stage, scrubbed): the slit opens to the whole framed plate while the photo de-zooms (Cartier-style
    mask reveal), the title lines leave up and down, an opaque lower-third band wipes up, and the plate caption and
    the statement set themselves char by char on it.
  Clarity: the photo is 2000×1333, so it is never full-bleed; the frame and the 1.2× zoom peak keep it ≤ native ÷ 2.
*/
export function TitleSequence() {
  const still = useStill();
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const stage = el.querySelector<HTMLElement>('.ts-stage')!;
    const photo = el.querySelector<HTMLElement>('.ts-photo')!;
    const img = el.querySelector<HTMLElement>('.ts-photo img')!;
    const slit = el.querySelector<HTMLElement>('.ts-slit')!;
    const band = el.querySelector<HTMLElement>('.ts-band')!;
    const end = el.querySelector<HTMLElement>('.ts-end')!;

    // The photo's clip is built from two numbers: `open` (the slit opening from a hairline, intro) and
    // `reveal` (the slit opening to the whole framed plate, scroll). Measured from the slit placeholder in the
    // grid, relative to the photo frame (the frame is capped at 820×546 so the 2000px photo stays sharp).
    const s = { open: still ? 1 : 0, reveal: 0 };
    let box = { t: 0, b: 0, l: 0, r: 0, H: 1 };
    const measure = () => {
      const sr = stage.getBoundingClientRect(), fr = photo.getBoundingClientRect(), r = slit.getBoundingClientRect();
      const H = fr.height, W = fr.width;
      const cl = (v: number, max: number) => Math.min(max, Math.max(0, v));
      box = { t: cl(r.top - fr.top, H), b: cl(fr.bottom - r.bottom, H), l: cl(r.left - fr.left, W), r: cl(fr.right - r.right, W), H };
      // The lower-third band starts a little above the end caption.
      const er = end.getBoundingClientRect();
      if (er.height) band.style.height = `${Math.ceil(sr.bottom - er.top + 32)}px`;
    };
    const clip = () => {
      const mid = box.t + (box.H - box.t - box.b) / 2;
      const top = (mid - (mid - box.t) * s.open) * (1 - s.reveal);
      const bot = (box.H - mid - (box.H - mid - box.b) * s.open) * (1 - s.reveal);
      const side = (1 - s.reveal);
      photo.style.clipPath = `inset(${top.toFixed(1)}px ${(box.r * side).toFixed(1)}px ${bot.toFixed(1)}px ${(box.l * side).toFixed(1)}px)`;
    };
    measure(); clip();
    const onResize = () => { measure(); clip(); };
    addEventListener('resize', onResize);
    document.fonts?.ready.then(() => { onResize(); ScrollTrigger.refresh(); });
    // Still / reduced motion: the composed end frame of the intro (photo in the slit), nothing moves.
    if (still) return () => removeEventListener('resize', onResize);

    const l1 = el.querySelector<HTMLElement>('.ts-l1 .ts-type')!;
    const l2 = el.querySelector<HTMLElement>('.ts-l2 .ts-type')!;
    const st = el.querySelector<HTMLElement>('.ts-statement')!;
    const split1 = SplitText.create(l1, { type: 'words,chars', charsClass: 'ch', wordsClass: 'wd' });
    const split2 = SplitText.create(l2, { type: 'chars', charsClass: 'ch' });
    const split3 = SplitText.create(st, { type: 'words,chars', charsClass: 'ch', wordsClass: 'wd' });
    const tilt = () => gsap.utils.random(-12, 12);

    // ---------- intro (time-based)
    gsap.set([split1.chars, split2.chars], { yPercent: 120, rotate: tilt, opacity: 0 });
    const intro = gsap.timeline({ delay: 0.15, defaults: { ease: 'expo.inOut' } });
    intro
      .fromTo(el.querySelectorAll('.fr-h'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.08 }, 0)
      .fromTo(el.querySelectorAll('.fr-v'), { scaleY: 0 }, { scaleY: 1, duration: 1.1, stagger: 0.08 }, 0.1)
      .fromTo(el.querySelectorAll('.ts-credit > span'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12 }, 0.35)
      .to(split1.chars, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.05, ease: 'back.out(1.7)', stagger: 0.035 }, 0.7)
      .to(s, { open: 1, duration: 1.2, onUpdate: clip }, 1.0)
      .fromTo(img, { scale: 1.2 }, { scale: 1.1, duration: 2.0, ease: 'power2.out' }, 1.0)
      .to(split2.chars, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.0, ease: 'back.out(1.7)', stagger: 0.05 }, 1.25)
      .fromTo(el.querySelectorAll('.ts-foot > *'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 1.65);
    // Scrolling during the intro finishes it at once, so the scroll timeline never fights it.
    const skip = () => { if (scrollY > 8 && intro.progress() < 1) intro.progress(1); };
    addEventListener('scroll', skip, { passive: true });

    // ---------- scroll (scrubbed through the sticky stage)
    gsap.set(split3.chars, { yPercent: 110, opacity: 0 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: SCROLL_FEEL.scrub, invalidateOnRefresh: true },
    });
    tl.to(s, { reveal: 1, duration: 0.55, ease: 'power2.inOut', onUpdate: clip }, 0)
      .to(img, { scale: 1, duration: 0.6, ease: 'power1.out' }, 0)
      .to('.ts-l1', { yPercent: -160, opacity: 0, duration: 0.42, ease: 'power2.in' }, 0)
      .to('.ts-l2', { yPercent: 160, opacity: 0, duration: 0.42, ease: 'power2.in' }, 0)
      .to(['.ts-credit', '.ts-foot'], { opacity: 0, y: (i) => (i ? 24 : -24), duration: 0.2 }, 0)
      // Lower third: an opaque band wipes up (clip-path) under the statement; no translucent scrim.
      .fromTo('.ts-band', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.25, ease: 'power2.inOut' }, 0.42)
      .fromTo('.ts-cap', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.15 }, 0.55)
      .to(split3.chars, { yPercent: 0, opacity: 1, duration: 0.16, ease: 'power3.out', stagger: 0.008 }, 0.58)
      .to({}, { duration: 0.08 });

    return () => {
      removeEventListener('resize', onResize);
      removeEventListener('scroll', skip);
      split1.revert(); split2.revert(); split3.revert();
    };
  }, { scope: root, dependencies: [still] });

  const meta = `${stats[0].value} committees · ${stats[1].value} days`;
  return (
    <section id="home" ref={root} className="ts" aria-labelledby="ts-title">
      <div className="ts-stage">
        <figure className="ts-photo">
          <img src={heroPhoto.src} width={heroPhoto.width} height={heroPhoto.height} alt={heroPhoto.alt} fetchPriority="high" />
        </figure>
        <span className="ts-band" aria-hidden="true" />

        <div className="ts-frame" aria-hidden="true">
          <span className="fr-h fr-t" /><span className="fr-h fr-b" /><span className="fr-v fr-l" /><span className="fr-v fr-r" />
        </div>

        <div className="ts-grid">
          <p className="ts-credit">
            <span>{conference.host}</span>
            <span className="ts-presents">presents</span>
          </p>
          <h1 id="ts-title" className="ts-title" aria-label={`${conference.edition}`}>
            <span className="ts-line ts-l1"><span className="ts-mask"><span className="ts-type" aria-hidden="true">DXB MUN</span></span></span>
            <span className="ts-slit" aria-hidden="true" />
            <span className="ts-line ts-l2"><span className="ts-mask"><em className="ts-type" aria-hidden="true">{conference.year}</em></span></span>
          </h1>
          <div className="ts-foot">
            <p className="ts-motto"><em>{conference.motto}.</em></p>
            <dl className="ts-meta">
              <div><dt>Where</dt><dd>{conference.city}</dd></div>
              <div><dt>When</dt><dd>{tba(conference.dates)}</dd></div>
              <div><dt>Sitting</dt><dd>{meta}</dd></div>
            </dl>
            <div className="ts-cta">
              <Button className={BTN} render={<a href={register} />}>Register</Button>
              <Button variant="outline" className={BTN} render={<a href={signIn} />}>Sign in</Button>
            </div>
          </div>
        </div>

        <div className="ts-end">
          <p className="ts-cap"><span className="ts-cap-k">Plate I</span>{heroPhoto.alt}.</p>
          <p className="ts-statement">A Model United Nations in Dubai.</p>
        </div>
      </div>
    </section>
  );
}
