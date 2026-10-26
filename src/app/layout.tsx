import type { Metadata, Viewport } from 'next';
import { Anuphan, IBM_Plex_Sans_Thai_Looped } from 'next/font/google';
import 'lenis/dist/lenis.css';
import './globals.css';

// headings and figures: Anuphan; text: IBM Plex Sans Thai Looped, whose looped letters read easily at small sizes. Both Google Fonts (OFL).
const anuphan = Anuphan({ weight: ['400', '500', '600'], subsets: ['thai', 'latin'], variable: '--font-display', display: 'swap' });
const plex = IBM_Plex_Sans_Thai_Looped({ weight: ['400', '500'], subsets: ['thai', 'latin'], variable: '--font-body', display: 'swap' });

const title = 'ฟ้าใส ทันตกรรม · ลาดพร้าว โชคชัย 4';
// the share image needs a full address: Vercel names the production domain, and a local build uses its own
const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3015';
const description = 'คลินิกทันตกรรมใกล้ MRT โชคชัย 4 เลือกหมอ เลือกเวลาที่ว่างจริง จองและมัดจำออนไลน์ได้เลย';
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title,
  description,
  openGraph: { title, description, type: 'website', siteName: 'ฟ้าใส ทันตกรรม', locale: 'th_TH' },
  twitter: { card: 'summary_large_image', title, description },
};

export const viewport: Viewport = {
  themeColor: '#f3f6f6',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${anuphan.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
