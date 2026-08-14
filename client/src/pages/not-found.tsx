import { ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useSeo } from '@/lib/seo';

export default function NotFound() {
  const [location] = useLocation();
  useSeo({
    title: 'Page not found | Tejass Kaushik',
    description: 'The requested page could not be found on Tejass Kaushik\'s portfolio.',
    path: location,
    noIndex: true,
  });

  return (
    <main className="case-page case-empty">
      <div className="case-shell">
        <p className="section-label">404 / Wrong turn</p>
        <h1>This page is still on the whiteboard.</h1>
        <Link className="text-link" href="/"><ArrowLeft size={17} /> Back home</Link>
      </div>
    </main>
  );
}
