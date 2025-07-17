import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Resume from "@/components/Resume";
import Portfolio from "@/components/Portfolio";
import Blog from "@/components/Awards";
import Footer from "@/components/Footer";

export default function Home() {
  useEffect(() => {
    // Smooth scrolling for navigation links
    const handleNavigation = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.href && target.href.includes("#")) {
        e.preventDefault();
        const sectionId = target.href.split("#")[1];
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    };

    document.addEventListener("click", handleNavigation);
    return () => document.removeEventListener("click", handleNavigation);
  }, []);

  return (
    <div className="font-sans bg-slate-50 text-slate-800">
      <Navigation />
      <Hero />
      <About />
      <Resume />
      <Portfolio />
      <Blog />
      <Footer />
    </div>
  );
}
