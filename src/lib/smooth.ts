import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// One smooth scroll for the whole page (Lenis), driven by GSAP's ticker so every ScrollTrigger reads the
// same scroll position Lenis has just set. Touch scrolls natively.

gsap.registerPlugin(ScrollTrigger);

let current: Lenis | null = null;
// the running smooth scroll, for the loader to hold the page still while it is up
export const smooth = () => current;

// Targets that live inside a pinned stage have no scroll position of their own; the stage registers
// where on the page each one is fully in view.
const anchors = new Map<string, () => number>();
export function registerAnchor(id: string, at: () => number) {
  anchors.set(id, at);
  return () => { anchors.delete(id); };
}
const anchorTop = (id: string) => anchors.get(id)?.();

export function mountSmooth() {
  const lenis = new Lenis({ lerp: 0.12 });
  current = lenis;
  const tick = (time: number) => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // links in the bar ease to their section's top edge: every section opens with enough room above its
  // heading for the bar, and landing lower left the hero's last strip showing behind the bar
  const onLink = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href^="#"]');
    const href = a?.getAttribute('href');
    if (!href) return;
    const id = decodeURIComponent(href.slice(1));
    const target = anchorTop(id) ?? (href === '#' ? document.body : document.getElementById(id));
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.2, easing: (t) => 1 - (1 - t) ** 3 });
  };
  addEventListener('click', onLink);

  return () => {
    removeEventListener('click', onLink);
    gsap.ticker.remove(tick);
    lenis.destroy();
    current = null;
  };
}
