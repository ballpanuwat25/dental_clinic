'use client';

import { useEffect, useRef } from 'react';
import { clinicMap as m } from '@/content/map';
import { where } from '@/content/site';
import { MOLAR } from '@/lib/molar';

// Where the clinic is: the facts on the left, a map cropped to the walk on the right. The streets and the walk
// come from OpenStreetMap through scripts/build-map.mjs; the walk draws itself when the map comes into view.

type Pt = readonly [number, number];
const VIEW = { x: 225, y: 300, w: 420, h: 330 };
const S = m.station as Pt;
const C = m.clinic as Pt;
// the data holds the monorail as one or two beams; one is drawn
const RAIL = 'M' + m.rail.split('M')[1];

export default function Where() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.classList.add('is-walked');
      io.disconnect();
    }, { rootMargin: '0px 0px -25% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="findus" id="where">
      <div className="findus-text">
        <h2>{where.title}</h2>
        <p className="lede">{where.lede}</p>
        <dl>
          {where.rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
        </dl>
      </div>
      <div className="map" ref={ref}>
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img"
          aria-label={`แผนที่: คลินิกอยู่บนถนนโชคชัย 4 เดิน ${m.walk.minutes} นาทีจาก ${where.station}`}>
          <path d={m.roads.lane} className="m-lane" />
          <path d={m.roads.street} className="m-street" />
          <path d={m.roads.major} className="m-major" />
          <path d={RAIL} className="m-rail" />
          <path d={m.walk.route} className="m-walk" pathLength={1} />
          <circle cx={S[0]} cy={S[1]} r={7} className="m-station" />
          <text className="m-place" x={S[0] + 14} y={S[1] + 18}>
            {where.station}<tspan className="m-code" dx={5}>{where.stationCode}</tspan>
          </text>
          <g transform={`translate(${C[0]} ${C[1]})`} className="m-clinic">
            <circle r={15} />
            <path transform="scale(.42) translate(-24 -20)" d={MOLAR} />
          </g>
          <text className="m-mark" x={C[0] + 22} y={C[1] - 12}>ฟ้าใส</text>
        </svg>
        <small>{where.credit}</small>
      </div>
    </section>
  );
}
