'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { loader } from '@/content/site';
import { MOLAR } from '@/lib/molar';
import { smooth } from '@/lib/smooth';
import { FRAMES_LOADED } from './Stage';

// The first-load screen: the brand's molar, drawn in outline, fills with sky from the root up as the type and
// the turning tooth's frames arrive, then shrinks away and the page fades in under it. It is in the server's
// HTML, so it covers the first paint; a fast connection sees it for a moment, a slow one opens when ready.

const MIN_MS = 1100; // the shortest run, so it is seen at all
const MAX_MS = 7000; // after this it opens whatever is still loading

export default function Loader() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const fill = el.querySelector('rect')!;
    const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
    smooth()?.stop();

    let frames = 0;
    let fonts = 0;
    // the highest count heard: in development the stage mounts twice, and the first mount's late arrivals
    // report a lower count
    const onFrames = (e: Event) => { frames = Math.max(frames, (e as CustomEvent<number>).detail); };
    addEventListener(FRAMES_LOADED, onFrames);
    document.fonts.ready.then(() => { fonts = 1; });

    const born = performance.now();
    let shown = 0;
    let opened = false;
    const tick = () => {
      // the first frame's time can be from just before the effect ran
      const t = Math.max(0, performance.now() - born);
      // never faster than MIN_MS; on a slow connection the real progress holds it back
      const goal = Math.min(fonts * 0.2 + frames * 0.8, fast ? 1 : t / MIN_MS);
      shown += (goal - shown) * 0.16;
      if (goal - shown < 0.003) shown = goal;
      // the molar is 40 units tall, filling from its roots (y 36) up to its crown (y 4)
      fill.setAttribute('y', String(36 - shown * 32));
      if ((shown >= 1 || t > MAX_MS) && !opened) open();
    };
    const open = () => {
      if (opened) return;
      opened = true;
      gsap.ticker.remove(tick);
      gsap.timeline({ onComplete: () => { el.hidden = true; smooth()?.start(); } })
        .to(el.querySelector('.loader-mark'), { scale: 0.6, autoAlpha: 0, duration: fast ? 0 : 0.5, ease: 'power2.in' }, 0.15)
        .to(el, { autoAlpha: 0, duration: fast ? 0 : 0.6, ease: 'power1.inOut' }, 0.35);
    };
    gsap.ticker.add(tick);
    // animation frames pause in a background tab; a plain timer still opens the page
    const fallback = window.setTimeout(open, MAX_MS + 500);

    return () => {
      window.clearTimeout(fallback);
      gsap.ticker.remove(tick);
      removeEventListener(FRAMES_LOADED, onFrames);
    };
  }, []);

  return (
    <div className="loader" ref={ref} aria-hidden="true">
      <div className="loader-mark">
        <svg viewBox="0 0 48 40">
          <defs>
            <clipPath id="loader-molar"><path d={MOLAR} /></clipPath>
          </defs>
          <rect x="0" y="36" width="48" height="40" clipPath="url(#loader-molar)" />
          <path d={MOLAR} />
        </svg>
        <p>{loader}</p>
      </div>
    </div>
  );
}
