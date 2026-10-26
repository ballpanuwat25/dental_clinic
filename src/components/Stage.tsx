'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clinic, facts, hero, packs } from '@/content/site';
import { bangkokNow } from '@/lib/days';
import { hhmm, nextFree, type Booked } from '@/lib/schedule';
import { registerAnchor } from '@/lib/smooth';
import { wordmark } from '@/content/wordmark';
import BookingPick from './BookingPick';

gsap.registerPlugin(ScrollTrigger);

// The turning frames (scripts/blender/tooth_turn.py), all cropped to one box, and where the body sits in it.
const TURN = { count: 48, w: 1284, h: 1233, cx: 0.2987, feet: 0.5742, top: 0.0284, bw: 0.4291 };
const frameSrc = (i: number) => `/turn/t${String(i).padStart(2, '0')}.webp`;
// how far through the pin each scene is fully in place, for the bar's links
const AT = { services: 0.5, book: 0.92 };
const PIN = 3; // the pin's length in screen heights
export const FRAMES_LOADED = 'fahsai:frames';

// One pinned stage, three scenes. The name stands on a floor line with the tooth between its two words;
// scroll parts the name, turns the tooth half round and brings it large to the right beside the packages;
// then lifts it into a ring at the top, over the booking form.
export default function Stage({ booked }: { booked: Booked }) {
  const ref = useRef<HTMLElement>(null);
  const [next, setNext] = useState<{ m: number; who: string; tomorrow: boolean } | null>(null);

  // the next free half hour depends on the visitor's clock, so it is found after the page is on screen
  useEffect(() => {
    const now = bangkokNow().minutes;
    const n = nextFree(booked, now);
    const t = n ?? nextFree(booked, 900);
    if (t) setNext({ m: t.m, who: t.doctor.short, tomorrow: !n });
  }, [booked]);

  useEffect(() => {
    const stage = ref.current!;
    const q = <T extends Element = HTMLElement>(s: string) => stage.querySelector(s) as T;
    const qa = <T extends Element = HTMLElement>(s: string) => [...stage.querySelectorAll(s)] as T[];
    const phone = matchMedia('(max-width: 860px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      // the light under the pointer fills the hollow name with sky; left alone it drifts across it
      const light = { x: 0.5, y: 0.56 };
      const setLight = () => {
        stage.style.setProperty('--x', `${light.x * 100}%`);
        stage.style.setProperty('--y', `${light.y * 100}%`);
      };
      const lx = gsap.quickTo(light, 'x', { duration: 0.8, ease: 'power3.out', onUpdate: setLight });
      const ly = gsap.quickTo(light, 'y', { duration: 0.8, ease: 'power3.out', onUpdate: setLight });
      let idle = 0;
      const onMove = (e: PointerEvent) => {
        const word = q('.word').getBoundingClientRect();
        lx((e.clientX - word.left) / word.width);
        ly((e.clientY - word.top) / word.height);
        idle = performance.now();
      };
      stage.addEventListener('pointermove', onMove);
      const drift = (t: number) => {
        if (performance.now() - idle < 3000) return;
        lx(0.5 + Math.sin(t * 0.35) * 0.4);
        ly(0.5 + Math.sin(t * 0.6) * 0.3);
      };
      if (!reduced) gsap.ticker.add(drift);
      setLight();

      // the tooth: preloaded frames on a canvas, nearest frame only
      const canvas = q<HTMLCanvasElement>('.tooth');
      const c2d = canvas.getContext('2d')!;
      const turn = { f: 0 };
      let shown = -1;
      // the loader waits on these: it hears how many have arrived
      let loaded = 0;
      const arrived = () => {
        loaded++;
        dispatchEvent(new CustomEvent(FRAMES_LOADED, { detail: loaded / TURN.count }));
      };
      const frames = Array.from({ length: TURN.count }, (_, i) => {
        const img = new Image();
        img.onload = () => { arrived(); if (i === Math.round(turn.f)) draw(true); };
        img.onerror = arrived;
        img.src = frameSrc(i);
        return img;
      });
      function draw(force = false) {
        const i = Math.round(turn.f);
        if (i === shown && !force) return;
        const img = frames[i];
        if (!img.complete || !img.naturalWidth) return;
        shown = i;
        c2d.clearRect(0, 0, canvas.width, canvas.height);
        c2d.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // geometry of the three scenes in stage pixels. The canvas's transform origin is the point under the
      // body on the floor, so x/y move that point and scale grows the tooth from where it stands.
      const floor = q('.floor');
      const frame = q('.frame');
      const leadPaths = qa<SVGPathElement>('.leads path');
      const leadDots = qa<SVGCircleElement>('.leads circle');
      const G = { p: { x: 0, y: 0, scale: 1 }, b: { x: 0, y: 0, scale: 1 }, floorRise: 0, ringY: 0 };
      function layout() {
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const floorY = floor.offsetTop;

        // the tooth stands centred in the gap between the two words' ink (each word's box is its ink)
        const word = q('.word');
        const [w1, w2] = qa('.word.hollow > span');
        const restX = word.offsetLeft + (w1.offsetLeft + w1.offsetWidth + w2.offsetLeft) / 2;
        // the body as wide as in the still hero, where the gap between the two words is 0.6 of --tooth
        // and the body 0.47 of it
        const ref = parseFloat(getComputedStyle(q('.word')).columnGap) / 0.6;
        const cw = (0.47 * ref) / TURN.bw;
        const ch = cw * (TURN.h / TURN.w);
        const dpr = Math.min(2, devicePixelRatio || 1);
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        const ox = TURN.cx * cw;
        const oy = TURN.feet * ch;
        Object.assign(canvas.style, {
          width: `${cw}px`, height: `${ch}px`, left: `${restX - ox - frame.offsetLeft}px`, top: `${floorY - oy - frame.offsetTop}px`, transformOrigin: `${ox}px ${oy}px`,
        });
        const bodyH = (TURN.feet - TURN.top) * ch;
        const bodyW = TURN.bw * cw;
        // scene 2: standing at the right, the body most of the frame's height (on a phone, centred above the list)
        // on a wide screen it stands on the frame's own bottom edge; on a phone, clear above the list, with room
        // for its shadow
        const pFloor = phone.matches ? q('.packs').offsetTop - 36 : frame.offsetTop + frame.offsetHeight - 1;
        const pScale = phone.matches ? 1.1 : Math.min(((pFloor - 130) * 0.82) / bodyH, (W * 0.4) / bodyW);
        const pX = phone.matches ? W / 2 : W * 0.68;
        // scene 3: small, centred near the top, in its ring
        const bScale = (phone.matches ? 64 : 100) / bodyH;
        const r = bodyH * bScale * 0.82;
        const outer = r * 1.28;
        const cy = frame.offsetTop + (phone.matches ? 14 : 24) + outer;
        G.p = { x: pX - restX, y: pFloor - floorY, scale: pScale };
        G.b = { x: W / 2 - restX, y: cy + (bodyH * bScale) / 2 - floorY, scale: bScale };
        G.floorRise = pFloor - floorY;
        G.ringY = cy - floorY;

        // the ring, and the floor line parted round it
        qa<SVGCircleElement>('.rings circle').forEach((c, i) => {
          c.setAttribute('cx', String(W / 2));
          c.setAttribute('cy', String(cy));
          c.setAttribute('r', String(i ? outer : r));
        });
        const side = W / 2 - outer - frame.offsetLeft;
        gsap.set(q('.rule.l'), { left: frame.offsetLeft, top: cy, width: side });
        gsap.set(q('.rule.r'), { left: W / 2 + outer, top: cy, width: side });
        gsap.set(q('.book-form'), { top: cy + outer + (phone.matches ? 14 : 22) });

        // leader lines from each package to its part of the tooth, in scene 2's pose
        const bx = pX - (bodyW * pScale) / 2;
        const by = pFloor - bodyH * pScale;
        const list = q('.packs');
        qa('.packs li').forEach((li, i) => {
          const [fx, fy] = packs.items[i].at;
          const ax = bx + fx * bodyW * pScale;
          const ay = by + fy * bodyH * pScale;
          const sx = list.offsetLeft + li.offsetWidth + 18;
          const sy = list.offsetTop + li.offsetTop + li.offsetHeight / 2;
          const kx = Math.min(ax - 40, sx + (ax - sx) * 0.45);
          leadPaths[i].setAttribute('d', `M${sx} ${sy}H${kx}L${ax} ${ay}`);
          leadDots[i].setAttribute('cx', String(ax));
          leadDots[i].setAttribute('cy', String(ay));
        });
        draw(true);
      }
      layout();

      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
        // scene 1 → 2: the name parts, the tooth turns and comes forward on the right
        .to(['.copy', '.next'], { autoAlpha: 0, y: -16, duration: 0.08, ease: 'power1.in' }, 0)
        .to('.menu', { autoAlpha: 0, y: 8, duration: 0.07, ease: 'power1.in' }, 0)
        .to('.word span:first-child', { xPercent: -160, autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 0)
        .to('.word span:last-child', { xPercent: 160, autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 0)
        .to(turn, { f: TURN.count - 1, duration: 0.34, ease: 'power1.inOut', onUpdate: () => draw() }, 0.04)
        .to(canvas, { x: () => G.p.x, y: () => G.p.y, scale: () => G.p.scale, duration: 0.34 }, 0.04)
        // where the floor lands on the frame's bottom edge it stops short of the rounded corners
        // the floor line goes down with the tooth and fades: in the packages scene the frame's edge is the floor
        .to(floor, { y: () => G.floorRise, duration: 0.34 }, 0.04)
        .to(floor, { autoAlpha: 0, duration: 0.1, ease: 'power1.in' }, 0.2)
        .fromTo('.packs-head', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'power2.out' }, 0.3)
        .fromTo('.packs li', { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 0.07, stagger: 0.025, ease: 'power2.out' }, 0.33)
        .set('.leads', { autoAlpha: 1 }, 0.36)
        .fromTo(leadPaths, { strokeDasharray: 1000, strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 0.1, stagger: 0.025, ease: 'power1.inOut' }, 0.36)
        .fromTo(leadDots, { autoAlpha: 0, scale: 0, transformOrigin: 'center' }, { autoAlpha: 1, scale: 1, duration: 0.04, stagger: 0.025, ease: 'back.out(3)' }, 0.44)
        // scene 2 → 3: the packages clear, the tooth rises into the ring with the floor line, the form comes up
        .to(['.packs-head', '.packs li', '.leads'], { autoAlpha: 0, y: -12, duration: 0.07, ease: 'power1.in' }, 0.6)
        .to(canvas, { x: () => G.b.x, y: () => G.b.y, scale: () => G.b.scale, duration: 0.16 }, 0.63)
        // and comes back rising with the tooth, to part round the ring
        .to(floor, { y: () => G.ringY, duration: 0.16 }, 0.63)
        .to(floor, { autoAlpha: 1, duration: 0.08, ease: 'power1.out' }, 0.65)
        .fromTo('.rings .ring', { strokeDasharray: 2000, strokeDashoffset: 2000 }, { strokeDashoffset: 0, duration: 0.12 }, 0.72)
        .fromTo('.rings .orbit', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, 0.76)
        .to(floor, { autoAlpha: 0, duration: 0.05 }, 0.8)
        .fromTo('.rule', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.8)
        .fromTo('.book-form', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.76)
        .fromTo('.book-form .pick, .book-form .sum', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.02, ease: 'power2.out' }, 0.78)
        .to({}, { duration: 0.1 }, 0.9);

      const st = ScrollTrigger.create({
        trigger: stage, start: 'top top', end: `+=${PIN * 100}%`, pin: true, scrub: 0.8, animation: tl, invalidateOnRefresh: true,
      });
      // the bar's links to scenes inside the pin land where that scene is fully in place
      const unService = registerAnchor('services', () => st.start + (st.end - st.start) * AT.services);
      const unBook = registerAnchor('book', () => st.start + (st.end - st.start) * AT.book);

      const onRefreshInit = () => { gsap.set(canvas, { clearProps: 'x,y,scale' }); };
      ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
      ScrollTrigger.addEventListener('refresh', layout);
      document.fonts.ready.then(() => ScrollTrigger.refresh());

      return () => {
        stage.removeEventListener('pointermove', onMove);
        gsap.ticker.remove(drift);
        ScrollTrigger.removeEventListener('refreshInit', onRefreshInit);
        ScrollTrigger.removeEventListener('refresh', layout);
        unService();
        unBook();
      };
    }, stage);
    return () => ctx.revert();
  }, []);

  return (
    <section className="stage" id="top" ref={ref}>
      <div className="frame" />
      <svg className="rings" aria-hidden="true"><circle className="orbit" /><circle className="ring" /></svg>
      <div className="floor" />
      <div className="rule l" /><div className="rule r" />
      <Name className="hollow" />
      <Name className="lit" />
      <div className="tooth-box"><canvas className="tooth" aria-hidden="true" /></div>
      <svg className="leads" aria-hidden="true">
        {packs.items.map((p) => <g key={p.name}><path /><circle r="4" /></g>)}
      </svg>

      <div className="copy">
        <p className="where">{hero.where}</p>
        <h1>{hero.title.map((line, i) => <span key={line}>{i ? ' ' : ''}<span className="nw">{line}</span></span>)}</h1>
      </div>
      <div className="next">
        <p>{hero.nextLabel}</p>
        <strong>{next ? <>{next.tomorrow ? `${hero.nextTomorrow} ` : ''}{hhmm(next.m)} <span>{next.who}</span></> : ' '}</strong>
        <a className="book" href="#book">{hero.book}</a>
        <small>{clinic.hours}</small>
      </div>
      <ul className="menu">
        {facts.map((f) => <li key={f.name}>{f.name}<b>{f.note}</b></li>)}
      </ul>

      <div className="packs-head">
        <p className="where">{packs.where}</p>
        <h2>{packs.title}</h2>
        <p>{packs.lede}</p>
      </div>
      <ul className="packs">
        {packs.items.map((p) => <li key={p.name}><b>{p.name}</b><span>{p.note}</span><em>{p.price}</em></li>)}
      </ul>

      <BookingPick booked={booked} />
    </section>
  );
}

// The name as two drawn words (scripts/build-wordmark.mjs), each box its ink, sized in em of --size and
// standing on its baseline. The lit copy fills with sky; the hollow copy is outline only.
function Name({ className }: { className: string }) {
  const { em, words } = wordmark;
  return (
    <div className={`word ${className}`} aria-hidden="true">
      {words.map((w, i) => (
        <span key={w.text} style={{ width: `${w.width / em}em`, height: `${w.height / em}em` }}>
          <svg viewBox={`0 ${-w.height} ${w.width} ${w.height}`}>
            {className === 'lit' && (
              <defs>
                <linearGradient id={`sky-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#7cc1ea" /><stop offset=".85" stopColor="#cfe9f6" />
                </linearGradient>
              </defs>
            )}
            <path d={w.d} fill={className === 'lit' ? `url(#sky-${i})` : undefined} />
          </svg>
        </span>
      ))}
    </div>
  );
}
