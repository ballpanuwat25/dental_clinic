import { clinic, demo, nav } from '@/content/site';
import { MOLAR } from '@/lib/molar';

// The foot: the clinic's own details in one ruled row, and the line saying this is a demo.
export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-row">
        <div className="foot-mark">
          <svg viewBox="0 0 48 40" aria-hidden="true"><path d={MOLAR} fill="currentColor" /></svg>
          <div><b>{clinic.full}</b><span>{clinic.address}</span></div>
        </div>
        <div><span>เวลาเปิด</span><b>10:00–20:00</b><span>หยุดวันพุธ</span></div>
        <div><span>โทร</span><b>{clinic.phone}</b></div>
        <nav aria-label="ในหน้านี้">
          {nav.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          <a href="#book">จองคิว</a>
        </nav>
      </div>
      <p className="foot-demo">{demo}</p>
    </footer>
  );
}
