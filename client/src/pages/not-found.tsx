import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found | Tejass Kaushik';
    // 404s should not be indexed.
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = robots?.getAttribute('content') ?? 'index, follow';
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, follow');
    return () => robots?.setAttribute('content', previous);
  }, []);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-[#070312] px-6 text-center text-[#f8fbff]">
      <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#c084fc]">404</p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">This page drifted off into space.</h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-[#ede9fe]/80">
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved. Let&rsquo;s get you back on track.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#a855f7] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c084fc] focus:outline-none focus:ring-2 focus:ring-[#c084fc] focus:ring-offset-2 focus:ring-offset-[#070312]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back home
      </Link>
    </main>
  );
}
