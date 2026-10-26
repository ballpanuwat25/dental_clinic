import { clinicMap } from './map';

// Every word and figure on the page, in one place. The clinic is fictional (credited as a demo in the foot);
// the address, the station and the walk are real, measured from OpenStreetMap.

export const clinic = {
  name: 'ฟ้าใส',
  full: 'ฟ้าใส ทันตกรรม',
  kind: 'คลินิกทันตกรรม',
  area: 'ลาดพร้าว โชคชัย 4',
  street: 'ถนนลาดพร้าว ปากซอยโชคชัย 4',
  address: 'ถนนโชคชัย 4 ใกล้แยกลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ',
  phone: '02-000-0000',
  hours: 'เปิด 10:00–20:00 หยุดวันพุธ',
  deposit: 300,
};

// the clinic's day, in minutes past midnight, and the day it closes (0 = Sunday)
export const OPEN = 600;
export const CLOSE = 1200;
export const CLOSED_WEEKDAY = 3;
export const SLOT = 30;

export const nav = [
  { href: '#services', label: 'บริการ' },
  { href: '#team', label: 'ทีมหมอ' },
  { href: '#where', label: 'ที่ตั้ง' },
];

export const hero = {
  where: `${clinic.kind} · ${clinic.street}`,
  title: ['หมอฟันใกล้บ้าน', 'ที่บอกเวลาว่างให้ดูก่อนจอง'],
  nextLabel: 'คิวว่างถัดไปวันนี้',
  nextTomorrow: 'พรุ่งนี้',
  book: 'จองเวลานี้',
};

// the row along the hero's floor: what a first visit needs to know (prices wait for the packages scene,
// the hours sit by the next free time)
export const facts = [
  { name: 'MRT โชคชัย 4', note: `สายสีเหลือง · เดิน ${clinicMap.walk.minutes} นาที` },
  { name: 'จอดรถหน้าคลินิก', note: '4 คัน' },
  { name: 'หมอ 3 คน', note: 'ตารางเวลาแยกกัน' },
  { name: 'มัดจำออนไลน์', note: `${clinic.deposit} บาท ผ่านพร้อมเพย์` },
];

// scene 2: packages, each pinned by a leader line to the part of the tooth it treats.
// `at` is a point on the tooth's body box, as fractions across and down.
export const packs = {
  where: 'บริการและแพ็กเกจ',
  title: 'รู้ราคาก่อนนั่งเก้าอี้',
  lede: 'ราคาเริ่มต้นของแต่ละแพ็กเกจบอกไว้ตรงนี้ ถ้าหมอตรวจแล้วต้องทำเพิ่ม จะบอกราคาก่อนลงมือ',
  items: [
    { name: 'อุดฟันสีเหมือนฟัน', note: 'ด้านละ · 30–45 นาที', price: '1,200', at: [0.5, 0.06] },
    { name: 'ฟอกสีฟันในคลินิก', note: 'ทั้งปาก · 90 นาที', price: '4,500', at: [0.3, 0.3] },
    { name: 'ตรวจ ขูดหินปูน ขัดฟัน', note: 'เอกซเรย์ 2 ฟิล์ม · 45 นาที', price: '1,290', at: [0.82, 0.55] },
    { name: 'รักษารากฟัน', note: 'ฟันหน้า ต่อซี่ · 60 นาทีต่อครั้ง', price: '6,500', at: [0.3, 0.9] },
  ] as { name: string; note: string; price: string; at: [number, number] }[],
};

// what can be booked online, and how long the chair is held for each
export const services = [
  { id: 'scale', name: 'ขูดหินปูน', minutes: 30 },
  { id: 'fill', name: 'อุดฟัน', minutes: 30 },
  { id: 'whiten', name: 'ฟอกสีฟัน', minutes: 90 },
  { id: 'root', name: 'รักษารากฟัน', minutes: 60 },
  { id: 'ortho', name: 'ปรึกษาจัดฟัน', minutes: 30 },
];

export type Doctor = { id: string; short: string; name: string; field: string };
export const doctors: Doctor[] = [
  { id: 'prae', short: 'หมอแพร', name: 'ทพญ. แพรวา ศรีสุข', field: 'ทันตกรรมทั่วไป · ฟอกสีฟัน' },
  { id: 'ton', short: 'หมอต้น', name: 'ทพ. ธนกฤต วงศ์ใหญ่', field: 'รักษารากฟัน · ถอนฟันคุด' },
  { id: 'nid', short: 'หมอนิด', name: 'ทพญ. นิดา ชัยมงคล', field: 'จัดฟัน · ฟันเด็ก' },
];

// scene 3
export const booking = {
  title: 'จองคิว',
  service: 'บริการ',
  doctor: 'หมอ',
  time: 'เวลาที่ยังว่าง',
  full: 'วันนี้เต็มแล้ว ลองหมอคนอื่น',
  depositNote: `มัดจำ ${clinic.deposit} บาท หักจากค่ารักษาในวันนัด`,
  next: 'ถัดไป · กรอกชื่อ',
  via: 'มัดจำผ่านพร้อมเพย์',
};

export const demo = 'ฟ้าใส ทันตกรรม เป็นคลินิกสมมติ · เว็บเดโมระบบจองคิวโดย PanuWeb';

export const team = {
  title: 'หมอสามคน ตารางคนละชุด',
  lede: 'เลือกหมอที่อยากให้ดูแลได้เลย แต่ละแถวคือวันนี้ของหมอคนนั้น จุดสีมิ้นต์คือเวลาที่ยังว่าง',
  bookWith: 'จองกับ',
  free: 'ว่างถัดไป',
  none: 'วันนี้เต็มแล้ว',
};

export const where = {
  title: 'ปากซอยโชคชัย 4',
  lede: `ลงรถไฟฟ้า MRT สายสีเหลืองที่สถานีโชคชัย 4 แล้วเดินเข้าถนนโชคชัย 4 อีก ${clinicMap.walk.metres} เมตร ราว ${clinicMap.walk.minutes} นาที`,
  station: 'MRT โชคชัย 4',
  stationCode: 'YL03',
  rows: [
    { label: 'ที่อยู่', value: clinic.address },
    { label: 'เวลาเปิด', value: '10:00–20:00 ทุกวัน ยกเว้นวันพุธ' },
    { label: 'จอดรถ', value: 'หน้าคลินิก 4 คัน' },
    { label: 'โทร', value: clinic.phone },
  ],
  credit: 'แผนที่จาก © OpenStreetMap contributors',
};

export const loader = 'ฟ้าใส ทันตกรรม';

