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

export default function Home() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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
      <Navigation />
      <Hero />
      <About />
      <Skills />
      <WesternIvey />
      <Experience />
      <Portfolio />
      <Awards />
      <Leadership />
      <ContactSection />
      <Footer />
    </AdvancedScroll3D>
  );
}
