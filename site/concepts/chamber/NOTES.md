# Chamber (flagship)

- **Idea:** the moment before a General Assembly opens, in a serious, institutional tone. The ground is near-black navy (`#050B14`) with navy surfaces, UN blue `#009EDB` as the primary colour and off-white type. Muted brass appears only on the portal "Preview" label. Green, amber and red are used only for status. Flat colour, no gradients. Depth comes from the photo, the white "lit" placards, and from scale and opacity.
- **Type:** Bricolage Grotesque Variable (standard file: wdth, opsz and wght). The wordmark and display type pair a heavy 75%-width cut with a light 100%-width cut. Inter Tight sets the text.
- **First screen:** the full-bleed photo carries:
  - "Model United Nations in Dubai";
  - the DXB MUN 2027 wordmark;
  - "Hosted by Indian High School. Dates: To be announced.";
  - one UN-blue "Explore committees" button;
  - a "19 committees over 3 days" teaser with a scroll cue.

  This works at 390, 820 and 1440. Once a layer has faded out it is made `inert`.
- **Signature:** GSAP ScrollTrigger (`scrub: SCROLL_FEEL.scrub`) pulls the photo back into a white placard over 0.6 of a screen, while "DXB" and "MUN" slide out from behind it. The 19 committees then run as a sticky horizontal rail of placards. The pin gives each placard 60 px of scroll and snaps to every placard (`directional: false`), so one wheel notch (80 px through Lenis) moves one placard. The rail has a NumberFlow `01 / 19` counter and also works with arrow keys, buttons and mouse drag. Phones, touch screens and still mode get a native scroll-snap rail.
- **Also:**
  - Nav: the shared `useSmoothScroll` / `scrollToSection` from `@/shared/scroll`, a full desktop nav with scroll-spy, a thin UN-blue scroll-progress line along the nav's bottom edge, and a full-screen phone menu.
  - Home sections: About statement words brighten as you scroll; a Base UI Tabs schedule with a to-scale day ribbon; wellness keys and "On the day" side by side; a keynote timer.
  - Portals: share one usePortal store.
- **Libraries:** gsap with ScrollTrigger and @gsap/react, lenis (through `@/shared/scroll`), @number-flow/react, @base-ui/react (Tabs, Menu, Dialog), motion (toasts), lucide-react and clsx.
- **Known gaps:**
  - The page is 6.0 screens with motion at 1440, against the audit's target of 5.5 or less; it is 4.1 in still mode. One-notch-per-placard snapping needs about 1.2 screens of pin, and the hero needs 0.6.
  - The audit can't read the NumberFlow timer digits ("0px"); the timer works visually.
  - The main JS chunk is about 700 kB (235 kB gzipped).
