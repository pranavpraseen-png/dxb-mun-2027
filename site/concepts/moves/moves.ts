// The motion-moves catalogue: one entry per specific effect (not per library).
// Every URL below was opened on 2026-11-05 (curl 200, or loaded in a browser where the site blocks bots).
// Licences: read from the package's package.json in node_modules, the GitHub API, the npm registry or the vendor's page.

export type Installed = 'yes' | 'native' | 'needs install';
export type Cost = 'low' | 'medium' | 'high';

export type Move = {
  id: string;
  name: string;
  what: string;
  sources: { label: string; url: string }[];
  licence: string;
  installed: Installed;
  /** What it needs (package or plugin), as installed in site/package.json. */
  uses: string;
  phone: Cost;
  clarity: string;
  where: string;
  /** Set when the move is built live on this page: the section id. */
  live?: string;
};

// Since 30 Apr 2025 every GSAP plugin is free, commercial use included; it only bars no-code builders that compete with Webflow.
const GSAP_LIC = 'GSAP Standard "no charge" licence (free, commercial OK)';

export const moves: Move[] = [
  {
    id: 'scramble', live: 'demo-scramble',
    name: 'Broadcast slate: committee codes decode',
    what: 'A programme-feed slate where each committee code scrambles into place, letter by letter.',
    sources: [
      { label: 'GSAP ScrambleTextPlugin', url: 'https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/' },
      { label: 'Motion Primitives: Text Scramble', url: 'https://motion-primitives.com/docs/text-scramble' },
    ],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap 3.15.1 ScrambleTextPlugin', phone: 'low',
    clarity: 'None: solid glyphs, no fades.',
    where: 'The broadcast-style opening, and the committee ticker under the hero.',
  },
  {
    id: 'globe-pin', live: 'demo-globe',
    name: 'Pinned globe flies to Dubai',
    what: 'A sticky scene: scroll turns and zooms a dotted globe until Dubai sits under a reticle.',
    sources: [
      { label: 'cobe', url: 'https://cobe.vercel.app/' },
      { label: 'GSAP ScrollTrigger', url: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/' },
      { label: 'Magic UI: Globe (cobe wrapper)', url: 'https://magicui.design/docs/components/globe' },
    ],
    licence: 'cobe MIT · ' + GSAP_LIC, installed: 'yes', uses: 'cobe 2.0.1 + gsap ScrollTrigger', phone: 'medium',
    clarity: 'cobe adds a rim glow: set glowColor to the ground colour so none shows. Dots are crisp at dpr 2.',
    where: 'Right after the opening: the hero hand-off from "the world" to "Dubai".',
  },
  {
    id: 'clause-mask', live: 'demo-clauses',
    name: 'Resolution clauses rise through line masks',
    what: 'SplitText cuts each clause into lines; each line slides up out of its own clip as it enters.',
    sources: [
      { label: 'GSAP SplitText (mask: "lines")', url: 'https://gsap.com/docs/v3/Plugins/SplitText/' },
      { label: 'Codrops: 5 demos using free GSAP plugins (2025)', url: 'https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/' },
    ],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap SplitText + ScrollTrigger', phone: 'low',
    clarity: 'None: a hard overflow clip, no blur-in.',
    where: 'Every fact on the page (About, Committees, Schedule), so big text alone tells the story.',
  },
  {
    id: 'counter', live: 'demo-clauses',
    name: 'Scroll-scrubbed counter',
    what: 'The number rolls 0 → 19 as you scroll the clause, digit by digit.',
    sources: [
      { label: 'NumberFlow', url: 'https://number-flow.barvian.me/' },
      { label: 'Motion Primitives: Sliding Number', url: 'https://motion-primitives.com/docs/sliding-number' },
      { label: 'Animate UI: Sliding Number', url: 'https://animate-ui.com/docs/primitives/animate-ui/sliding-number' },
    ],
    licence: 'NumberFlow MIT', installed: 'yes', uses: '@number-flow/react 0.6.2', phone: 'low',
    clarity: 'NumberFlow fades the rolling digits with a soft mask-image by default: set --number-flow-mask-height/width to 0 (done here) for a hard clip.',
    where: 'The stats strip: 19 committees, 3 days, 6 committee sessions.',
  },
  {
    id: 'plate-flip', live: 'demo-flip',
    name: 'Nameplates Flip from a stack into the committee grid',
    what: 'Nineteen UN nameplates sit stacked on the dais, then fly to their seats in one Flip.',
    sources: [
      { label: 'GSAP Flip', url: 'https://gsap.com/docs/v3/Plugins/Flip/' },
      { label: 'Codrops: infinite scroll gallery with Flip (2026)', url: 'https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/' },
    ],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap Flip', phone: 'low',
    clarity: 'Text is rotated mid-flight only; it lands at 0° on whole pixels.',
    where: 'The Committees section: stack on arrival, grid on scroll or tap.',
  },
  {
    id: 'dusk-shader', live: 'demo-dusk',
    name: 'Shader dusk sky that sets as you scroll',
    what: 'A full-bleed GLSL sky: the sun sinks into the Gulf and the sea-blue night takes over.',
    sources: [
      { label: 'React Three Fiber', url: 'https://r3f.docs.pmnd.rs/' },
      { label: 'Paper Shaders (reference for the approach)', url: 'https://shaders.paper.design/' },
      { label: 'The Book of Shaders', url: 'https://thebookofshaders.com/' },
    ],
    licence: 'three MIT · @react-three/fiber MIT · own GLSL', installed: 'yes', uses: 'three 0.187 + @react-three/fiber', phone: 'medium',
    clarity: 'Smooth gradients only; the sun edge is a 1-device-pixel antialias, no bloom, no grain.',
    where: 'Hero backdrop behind "Diplomacy around us.", or the footer as "the day closes".',
  },
  {
    id: 'hover-distort', live: 'demo-photo',
    name: 'WebGL photo stretch on hover',
    what: 'The event photo smears gently with the cursor, then settles back to exact pixels.',
    sources: [
      { label: 'Codrops: motion hover effects with image distortions', url: 'https://tympanus.net/codrops/2019/10/21/how-to-create-motion-hover-effects-with-image-distortions-using-three-js/' },
      { label: 'OGL examples: Mouse Flowmap', url: 'https://oframe.github.io/ogl/examples/' },
    ],
    licence: 'three MIT · own GLSL (OGL itself is Unlicense, not installed)', installed: 'yes', uses: 'three + @react-three/fiber', phone: 'medium',
    clarity: 'At rest the shader is the identity: 1:1 texels at ≤1000 CSS px. Distortion only while moving.',
    where: 'The one real event photo (About or the opening ceremony slot).',
  },
  {
    id: 'vt-nav', live: 'demo-vt',
    name: 'View-Transition nav with a clip wipe',
    what: 'The nav ink slides to the new tab and the next panel wipes in, both by the browser.',
    sources: [
      { label: 'Chrome: View Transitions', url: 'https://developer.chrome.com/docs/web-platform/view-transitions' },
      { label: 'view-transitions.chrome.dev demos', url: 'https://view-transitions.chrome.dev/' },
    ],
    licence: 'Web platform, free', installed: 'native', uses: 'document.startViewTransition (Baseline since Oct 2025)', phone: 'low',
    clarity: 'None: snapshots are clipped, not blurred. The root cross-fade is switched off.',
    where: 'The full top nav, and opening a committee from the grid.',
  },
  {
    id: 'magnetic', live: 'demo-magnetic',
    name: 'Magnetic Register button with a label roll',
    what: 'The button leans toward the cursor on a spring; the label rolls to a second line.',
    sources: [
      { label: 'Motion Primitives: Magnetic', url: 'https://motion-primitives.com/docs/magnetic' },
      { label: 'React Bits: Magnet', url: 'https://reactbits.dev/animations/magnet' },
      { label: 'Animate UI: Magnetic', url: 'https://animate-ui.com/docs/primitives/animate-ui/magnetic' },
    ],
    licence: 'motion MIT · Motion Primitives MIT · React Bits MIT + Commons Clause', installed: 'yes', uses: 'motion 14.9 springs', phone: 'low',
    clarity: 'None. Off on touch screens, where it would only lag.',
    where: 'The one Register button (nav and hero).',
  },
  {
    id: 'lenis',
    name: 'Lenis smooth scroll on the GSAP ticker',
    what: 'Weighted, even scrolling that keeps every scrubbed scene in step. This page runs it.',
    sources: [
      { label: 'Lenis', url: 'https://lenis.darkroom.engineering/' },
      { label: 'GitHub', url: 'https://github.com/darkroomengineering/lenis' },
    ],
    licence: 'MIT', installed: 'yes', uses: 'lenis 1.3.27', phone: 'low',
    clarity: 'None. Turned off for reduced motion.',
    where: 'The whole homepage.',
  },
  {
    id: 'svg-map',
    name: 'Scroll-drawn route on an SVG map',
    what: 'A line draws across a flat map to Dubai while a camera group pans with it.',
    sources: [
      { label: 'Codrops: scroll-driven SVG map animations (2026)', url: 'https://tympanus.net/codrops/2026/05/21/creating-scroll-driven-svg-map-animations-with-gsap/' },
      { label: 'GSAP DrawSVG', url: 'https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/' },
    ],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap DrawSVG + MotionPath', phone: 'low',
    clarity: 'None: vector strokes.',
    where: 'A lighter phone alternative to the 3D globe.',
  },
  {
    id: 'svg-mask',
    name: 'SVG mask transition between sections',
    what: 'The next section is revealed through a growing shape (a letterform or the emblem).',
    sources: [{ label: 'Codrops: SVG mask transitions on scroll (2026)', url: 'https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/' }],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap ScrollTrigger', phone: 'low',
    clarity: 'Use a hard mask, never a feathered one.',
    where: 'Opening → hero photo, seen through the "DXB" letters.',
  },
  {
    id: 'sticky-grid',
    name: 'Sticky grid that rearranges on scroll',
    what: 'A pinned grid whose cells slide and resize as you scroll through it.',
    sources: [{ label: 'Codrops: Sticky Grid Scroll (2026)', url: 'https://tympanus.net/codrops/2026/03/02/sticky-grid-scroll-building-a-scroll-driven-animated-grid/' }],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap ScrollTrigger', phone: 'medium',
    clarity: 'None.',
    where: 'The 3-day schedule: one column per day, sessions slide into place.',
  },
  {
    id: 'parallel-pages',
    name: 'Parallel page transitions on one timeline',
    what: 'The old and new pages stay mounted and animate together with a persistent 3D scene.',
    sources: [{ label: 'Codrops: parallel page transitions with GSAP and React Router (2026)', url: 'https://tympanus.net/codrops/2026/10/08/building-parallel-page-transitions-with-gsap-and-react-router/' }],
    licence: GSAP_LIC + ' · React Router MIT', installed: 'needs install', uses: 'react-router (not installed); the hash router could stand in', phone: 'medium',
    clarity: 'None if the wipe is a clip.',
    where: 'Home → Committees → Schedule as separate short pages, with the globe kept alive.',
  },
  {
    id: 'morph',
    name: 'MorphSVG emblem morph',
    what: 'One vector shape morphs into another: the globe outline into the conference mark.',
    sources: [{ label: 'GSAP MorphSVG', url: 'https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/' }],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap MorphSVG', phone: 'low',
    clarity: 'None: vector.',
    where: 'The loader / first frame, once the new logo arrives.',
  },
  {
    id: 'inertia',
    name: 'Draggable committee rail with inertia',
    what: 'A thumb-flick rail of nameplates that glides and snaps to a plate.',
    sources: [
      { label: 'GSAP InertiaPlugin', url: 'https://gsap.com/docs/v3/Plugins/InertiaPlugin/' },
      { label: 'GSAP Draggable', url: 'https://gsap.com/docs/v3/Plugins/Draggable/' },
    ],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap Draggable + Inertia', phone: 'low',
    clarity: 'None.',
    where: 'The phone version of the committees.',
  },
  {
    id: 'observer',
    name: 'Observer chapter snaps',
    what: 'One wheel or swipe moves a whole chapter; good for a 4-slide broadcast opening.',
    sources: [{ label: 'GSAP Observer', url: 'https://gsap.com/docs/v3/Plugins/Observer/' }],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap Observer', phone: 'low',
    clarity: 'None. Risk: it takes over scrolling, so keep it to the opening only.',
    where: 'The broadcast opening chapters, then normal scroll.',
  },
  {
    id: 'css-scroll',
    name: 'CSS scroll-driven progress and reveals',
    what: 'animation-timeline: scroll() and view() run on the compositor with no JavaScript.',
    sources: [{ label: 'scroll-driven-animations.style', url: 'https://scroll-driven-animations.style/' }],
    licence: 'Web platform, free', installed: 'native', uses: 'CSS only', phone: 'low',
    clarity: 'None.',
    where: 'A 1px reading-progress rule under the nav. Not in every browser yet (not verified for Firefox), so keep a static fallback.',
  },
  {
    id: 'layout-id',
    name: 'Shared-element morph: plate → committee sheet',
    what: 'A nameplate grows into the committee detail sheet with motion layoutId.',
    sources: [{ label: 'Motion: layout animations', url: 'https://motion.dev/docs/react-layout-animations' }],
    licence: 'MIT', installed: 'yes', uses: 'motion 14.9', phone: 'low',
    clarity: 'Text scales mid-morph; use layout="position" on text so it never rests scaled.',
    where: 'Tap a committee in the grid.',
  },
  {
    id: 'scroll-smoother',
    name: 'ScrollSmoother data-speed parallax',
    what: 'Per-element parallax speeds on top of smooth scroll, set by one attribute.',
    sources: [{ label: 'GSAP ScrollSmoother', url: 'https://gsap.com/docs/v3/Plugins/ScrollSmoother/' }],
    licence: GSAP_LIC, installed: 'yes', uses: 'gsap ScrollSmoother', phone: 'medium',
    clarity: 'None. Pick Lenis or ScrollSmoother, not both.',
    where: 'Clause numbers drifting slower than the clauses.',
  },
  {
    id: 'webgl-text',
    name: 'DOM-synced WebGL headline',
    what: 'The real HTML headline stays for SEO; a WebGL copy on top gets the shader reveal.',
    sources: [
      { label: 'Codrops: responsive, SEO-friendly WebGL text (2025)', url: 'https://tympanus.net/codrops/2025/06/05/how-to-create-responsive-and-seo-friendly-webgl-text/' },
      { label: 'drei: Text', url: 'https://drei.docs.pmnd.rs/abstractions/text' },
    ],
    licence: 'drei MIT · three MIT', installed: 'yes', uses: 'drei <Text> (troika SDF)', phone: 'medium',
    clarity: 'High risk: SDF text is softer than DOM text. Use only at display sizes, mid-motion.',
    where: 'Hero "DXB MUN 2027" only.',
  },
  {
    id: 'paper-image',
    name: 'Paper Shaders image filters (Fluted Glass, Image Dithering)',
    what: 'Ready-made GPU filters over a photo: glass flutes like a tower facade, or print dithering.',
    sources: [
      { label: 'Paper Shaders', url: 'https://shaders.paper.design/' },
      { label: 'GitHub', url: 'https://github.com/paper-design/shaders' },
    ],
    licence: 'Apache-2.0', installed: 'yes', uses: '@paper-design/shaders-react 0.0.82', phone: 'medium',
    clarity: 'High risk: fluted glass reads soft and dithering reads as grain. Not recommended under the clarity rules.',
    where: 'Skip, or only as a hover state on the photo.',
  },
  {
    id: 'theatre',
    name: 'Theatre.js keyframed camera for the opening',
    what: 'A visual timeline editor to hand-tune the globe and camera choreography.',
    sources: [
      { label: 'Theatre.js', url: 'https://www.theatrejs.com/' },
      { label: 'GitHub', url: 'https://github.com/theatre-js/theatre' },
    ],
    licence: '@theatre/core Apache-2.0 · @theatre/studio AGPL-3.0 (dev only) · latest npm 0.7.2', installed: 'needs install', uses: '@theatre/core + @theatre/studio', phone: 'low',
    clarity: 'None (authoring tool).',
    where: 'Authoring the broadcast opening; ship only the exported JSON + core.',
  },
  {
    id: 'rive',
    name: 'Rive state-machine emblem',
    what: 'A vector animation with states (idle, hover, pressed) driven by the page.',
    sources: [{ label: 'Rive pricing', url: 'https://rive.app/pricing' }],
    licence: 'Runtimes MIT. Free editor exports show a Rive splash; Cadet $9/seat/month removes it', installed: 'needs install', uses: '@rive-app/react-canvas', phone: 'low',
    clarity: 'Crisp if the canvas uses dpr 2.',
    where: 'An animated emblem once the new logo exists.',
  },
  {
    id: 'spline',
    name: 'Spline 3D scene',
    what: 'A designed 3D scene (a delegate desk, the hall) embedded as a runtime.',
    sources: [{ label: 'Spline pricing', url: 'https://spline.design/pricing' }],
    licence: 'Free plan exports carry a Spline watermark; Hobby $15/month ($12 yearly) removes it', installed: 'needs install', uses: '@splinetool/react-spline', phone: 'high',
    clarity: 'Medium: heavy runtime, soft default lighting.',
    where: 'Not recommended: three + R3F already cover it with less weight.',
  },
  {
    id: 'unicorn',
    name: 'Unicorn Studio WebGL scene',
    what: 'No-code layered WebGL effects exported as a small JS embed (about 38 kB).',
    sources: [{ label: 'Unicorn Studio', url: 'https://www.unicorn.studio/' }],
    licence: 'Free tier is personal, non-commercial, with branding; Legend $20/month or $168/year (per its pricing page via search)', installed: 'needs install', uses: 'Unicorn Studio SDK', phone: 'medium',
    clarity: 'High: most presets are glow, grain and blobs, the "AI look" the owner rejected.',
    where: 'Not recommended.',
  },
];

export const liveIds = ['demo-scramble', 'demo-globe', 'demo-clauses', 'demo-flip', 'demo-dusk', 'demo-photo', 'demo-vt', 'demo-magnetic'] as const;
export type LiveId = (typeof liveIds)[number];

/** Names for the like toggles on the live demos (the picks bar reads these). */
export const liveNames: Record<LiveId, string> = {
  'demo-scramble': 'Live 1 · Broadcast slate decode',
  'demo-globe': 'Live 2 · Globe flies to Dubai',
  'demo-clauses': 'Live 3 · Clause line masks + counter',
  'demo-flip': 'Live 4 · Nameplate Flip',
  'demo-dusk': 'Live 5 · Shader dusk sky',
  'demo-photo': 'Live 6 · Photo stretch on hover',
  'demo-vt': 'Live 7 · View-Transition nav',
  'demo-magnetic': 'Live 8 · Magnetic Register',
};
