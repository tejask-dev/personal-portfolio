import Navigation from '../components/Navigation';
import Hero from '../components/Hero';
import About from '../components/About';
import Experience from '../components/Experience';
import Portfolio from '../components/Portfolio';
import Awards from '../components/Awards';
import Footer from '../components/Footer';
import AdvancedScroll3D from '../components/AdvancedScroll3D';

export default function Home() {
  return (
        <AdvancedScroll3D>
      <Navigation />
      <Hero />
      <About />
            <Experience />
      <Portfolio />
      <Awards />
      <Footer />
        </AdvancedScroll3D>
  );
}