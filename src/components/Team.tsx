'use client';

import { useEffect, useState } from 'react';
import { CLOSE, OPEN, SLOT, doctors, team } from '@/content/site';
import { bangkokNow } from '@/lib/days';
import { freeSlots, hhmm, isFree, type Booked } from '@/lib/schedule';

export const PICK_DOCTOR = 'fahsai:doctor';
const HOURS = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => OPEN + i * 60);
const at = (m: number) => `${((m - OPEN) / (CLOSE - OPEN)) * 100}%`;

// The three dentists as three ruled rows, each with today drawn as a line from opening to closing: a mint dot
// for every free half hour, a faint dash where it is booked, the past greyed. Booking from a row picks that
// dentist in the form above.
export default function Team({ booked }: { booked: Booked }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(bangkokNow().minutes), []);

  return (
    <section className="team" id="team">
      <div className="sec-head">
        <h2>{team.title}</h2>
        <p>{team.lede}</p>
      </div>
      <ul className="team-rows">
        {doctors.map((d) => {
          const next = now === null ? null : freeSlots(booked, d.id, now)[0];
          return (
            <li key={d.id}>
              <div className="who">
                <b>{d.name}</b>
                <span>{d.field}</span>
              </div>
              <div className="day" aria-hidden="true">
                {HOURS.map((h) => <i key={h} className="hr" style={{ left: at(h) }}><em>{h / 60}</em></i>)}
                {HOURS.slice(0, -1).flatMap((h) => [h, h + SLOT]).map((m) => (
                  <i
                    key={m}
                    className={`${isFree(booked, d.id, m) ? 'free' : 'taken'}${now !== null && m + SLOT <= now ? ' past' : ''}`}
                    style={{ left: at(m + SLOT / 2) }}
                  />
                ))}
              </div>
              <div className="go">
                <p>{next !== undefined && next !== null ? <>{team.free} <b>{hhmm(next)}</b></> : now === null ? ' ' : team.none}</p>
                <a className="book line" href="#book" onClick={() => dispatchEvent(new CustomEvent(PICK_DOCTOR, { detail: d.id }))}>
                  {team.bookWith}{d.short}
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
