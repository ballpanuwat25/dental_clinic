'use client';

import { useEffect, useMemo, useState } from 'react';
import { booking, doctors, services } from '@/content/site';
import { bangkokNow } from '@/lib/days';
import { freeSlots, hhmm, nextFree, type Booked } from '@/lib/schedule';
import { PICK_DOCTOR } from './Team';

// The booking form's first step, under the ring: a service, a dentist, then only the times that dentist
// still has free for that long. Read back in one line above the button.
export default function BookingPick({ booked }: { booked: Booked }) {
  const [service, setService] = useState(services[0].id);
  const [doctor, setDoctor] = useState(doctors[0].id);
  const [time, setTime] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);

  // a row in the team section can pick the dentist
  useEffect(() => {
    const pick = (e: Event) => setDoctor((e as CustomEvent<string>).detail);
    addEventListener(PICK_DOCTOR, pick);
    return () => removeEventListener(PICK_DOCTOR, pick);
  }, []);

  // start on whoever is free first; "now" is the visitor's clock, so it is read after the page is up
  useEffect(() => {
    const now = bangkokNow().minutes;
    setFrom(now);
    const n = nextFree(booked, now);
    if (n) setDoctor(n.doctor.id);
  }, [booked]);

  const minutes = services.find((s) => s.id === service)!.minutes;
  const slots = useMemo(() => (from === null ? [] : freeSlots(booked, doctor, from, minutes).slice(0, 7)), [booked, doctor, from, minutes]);
  const picked = time !== null && slots.includes(time) ? time : (slots[0] ?? null);
  const who = doctors.find((d) => d.id === doctor)!;

  return (
    <form className="book-form" id="book" onSubmit={(e) => e.preventDefault()}>
      <h2>{booking.title}</h2>
      <p>วันนี้ · {booking.via}</p>
      <div className="pick" role="group" aria-labelledby="l-svc">
        <span id="l-svc">{booking.service}</span>
        <div className="chips">
          {services.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === service} onClick={() => setService(s.id)}>{s.name}</button>
          ))}
        </div>
      </div>
      <div className="pick" role="group" aria-labelledby="l-doc">
        <span id="l-doc">{booking.doctor}</span>
        <div className="chips">
          {doctors.map((d) => (
            <button key={d.id} type="button" aria-pressed={d.id === doctor} onClick={() => setDoctor(d.id)}>{d.short}</button>
          ))}
        </div>
      </div>
      <div className="pick" role="group" aria-labelledby="l-time">
        <span id="l-time">{booking.time}</span>
        <div className="chips times">
          {slots.length
            ? slots.map((m) => <button key={m} type="button" aria-pressed={m === picked} onClick={() => setTime(m)}>{hhmm(m)}</button>)
            : <span>{booking.full}</span>}
        </div>
      </div>
      <div className="sum">
        <p>
          {services.find((s) => s.id === service)!.name} · {who.short}{picked !== null ? ` · ${hhmm(picked)}` : ''}
          <small>{booking.depositNote}</small>
        </p>
        <a className="book" href="#book">{booking.next}</a>
      </div>
    </form>
  );
}
