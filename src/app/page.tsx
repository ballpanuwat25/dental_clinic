import Bar from '@/components/Bar';
import Footer from '@/components/Footer';
import Loader from '@/components/Loader';
import SmoothScroll from '@/components/SmoothScroll';
import Stage from '@/components/Stage';
import Team from '@/components/Team';
import Where from '@/components/Where';
import { demoBooked } from '@/lib/schedule';

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Loader />
      <Bar />
      <main>
        <Stage booked={demoBooked} />
        <Team booked={demoBooked} />
        <Where />
      </main>
      <Footer />
    </>
  );
}
