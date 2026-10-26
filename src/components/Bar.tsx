'use client';

import { useEffect } from 'react';
import { clinic, nav } from '@/content/site';
import { MOLAR } from '@/lib/molar';

// The bar floats over the stage, whose frame starts below it, and takes the page's ground once the
// stage has scrolled away, so it never sits on top of text.
export default function Bar() {
  useEffect(() => {
    const onScroll = () => {
      // the pinned stage sits in a spacer as tall as its whole scroll; once the pin lets go (the spacer's foot
      // reaches the screen's), the stage's own content starts sliding under the bar
      const stage = document.getElementById('top');
      const box = (stage?.parentElement ?? stage)?.getBoundingClientRect();
      document.documentElement.dataset.barSolid = String(!box || box.bottom <= innerHeight + 1);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="bar">
      <a className="mark" href="#top">
        <svg viewBox="0 0 48 40" aria-hidden="true"><path d={MOLAR} fill="currentColor" /></svg>
        <span><b>{clinic.name}</b><small>ทันตกรรม · {clinic.area}</small></span>
      </a>
      <nav>{nav.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}</nav>
      <a className="book" href="#book">จองคิว</a>
    </header>
  );
}
