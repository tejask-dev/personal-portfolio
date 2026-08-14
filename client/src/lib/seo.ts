import { useEffect } from 'react';

/** Centralized production origin — update here if the domain changes. */
export const SITE_URL = 'https://tejass-kaushik.vercel.app';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_TITLE = 'Tejass Kaushik — Software & Product Builder';
export const DEFAULT_DESCRIPTION =
  'Tejass Kaushik builds software and tests product ideas. Former CTO at Stellar Learning, a platform reporting 40,000+ learners.';

type SeoOptions = {
  title?: string;
  description?: string;
  /** Path beginning with "/" — combined with SITE_URL for the canonical and og:url. */
  path?: string;
  noIndex?: boolean;
};

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Client-side SEO for an SPA route: keeps the document title, meta description,
 * canonical URL, and the title/url social tags in sync with the active page.
 * Crawlers that execute JavaScript pick these up; non-JavaScript scrapers fall
 * back to the static defaults in index.html.
 */
export function useSeo({ title, description, path = '/', noIndex = false }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title ?? DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, follow' : 'index, follow');
    setCanonical(url);
  }, [title, description, path, noIndex]);
}
