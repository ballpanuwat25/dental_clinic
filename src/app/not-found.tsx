import type { Metadata } from 'next';
import Link from 'next/link';
import { clinic, lost } from '@/content/site';
import { MOLAR } from '@/lib/molar';

// Any address the site does not have: 404 with the brand's molar as the 0, gone, its place a dashed outline
// like the gap a pulled tooth leaves.

export const metadata: Metadata = { title: `${lost.title} · ${clinic.full}`, robots: { index: false } };

export default function NotFound() {
  return (
    <main className="lost">
      <Link className="mark" href="/">
        <svg viewBox="0 0 48 40" aria-hidden="true"><path d={MOLAR} fill="currentColor" /></svg>
        <span><b>{clinic.name}</b><small>ทันตกรรม · {clinic.area}</small></span>
      </Link>
      <div className="lost-in">
        <p className="lost-no" aria-label="404">
          <span aria-hidden="true">4</span>
          <svg viewBox="0 0 48 40" aria-hidden="true"><path d={MOLAR} /></svg>
          <span aria-hidden="true">4</span>
        </p>
        <h1>{lost.heading}</h1>
        <p className="lost-text">{lost.text}</p>
        <div className="lost-act">
          <Link className="book" href="/">{lost.home}</Link>
          <Link className="book line" href="/#book">{lost.book}</Link>
        </div>
      </div>
    </main>
  );
}
