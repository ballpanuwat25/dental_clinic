import { CLOSE, OPEN, SLOT, doctors, type Doctor } from '@/content/site';

// Which half hours each dentist still has free on one day. `booked` holds each dentist's taken spans in
// minutes past midnight; it comes from the database, and from the demo seed until that is connected.

export type Booked = Record<string, [number, number][]>;

export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// free for `minutes` from `start`, inside opening hours
export const isFree = (booked: Booked, doctorId: string, start: number, minutes = SLOT) =>
  start >= OPEN && start + minutes <= CLOSE && !(booked[doctorId] ?? []).some(([a, b]) => start < b && start + minutes > a);

export function freeSlots(booked: Booked, doctorId: string, from = OPEN, minutes = SLOT) {
  const out: number[] = [];
  for (let m = Math.ceil(from / SLOT) * SLOT; m < CLOSE; m += SLOT) if (isFree(booked, doctorId, m, minutes)) out.push(m);
  return out;
}

// the first half hour from `from` that anyone is free, and who
export function nextFree(booked: Booked, from: number): { m: number; doctor: Doctor } | null {
  for (let m = Math.ceil(from / SLOT) * SLOT; m < CLOSE; m += SLOT) {
    const doctor = doctors.find((d) => isFree(booked, d.id, m));
    if (doctor) return { m, doctor };
  }
  return null;
}

// a believable day for the demo: about half of each dentist's day taken
export const demoBooked: Booked = {
  prae: [[600, 690], [720, 780], [840, 900], [960, 1050], [1110, 1170]],
  ton: [[630, 750], [780, 870], [930, 990], [1020, 1140]],
  nid: [[600, 660], [690, 810], [870, 960], [1050, 1110], [1140, 1200]],
};
