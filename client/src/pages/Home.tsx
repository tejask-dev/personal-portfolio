import Navigation from '../components/Navigation';
import Hero from '../components/Hero';
import About from '../components/About';
import Skills from '../components/Skills';
import WesternIvey from '../components/WesternIvey';
import Experience from '../components/Experience';
import Portfolio from '../components/Portfolio';
import Awards from '../components/Awards';
import Leadership from '../components/Leadership';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import AdvancedScroll3D from '../components/AdvancedScroll3D';
import Preloader from '../components/Preloader';
import RobotStage from '../components/RobotStage';
import ElasticCursor from '../components/ElasticCursor';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSeo } from '@/lib/seo';

export default function Home() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  useSeo({ path: '/' });

  return (
    <AdvancedScroll3D
      stage={isDesktop ? <RobotStage /> : undefined}
      overlay={
        <>
          <ElasticCursor />
          <Preloader />
        </>
      }
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-[#a855f7] focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        <Hero />
        <About />
        <Skills />
        <WesternIvey />
        <Experience />
        <Portfolio />
        <Awards />
        <Leadership />
        <ContactSection />
      </main>
      <Footer />
    </AdvancedScroll3D>
  );
}
