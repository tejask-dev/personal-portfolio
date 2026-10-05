import { useEffect } from "react";
import { socialMetadata } from "./socialMetadata";

import { SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "./siteMetadata";
export {
  SITE_URL,
  OG_IMAGE,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
} from "./siteMetadata";

type SeoOptions = {
  title?: string;
  description?: string;
  /** Path beginning with "/" — combined with SITE_URL for the canonical and og:url. */
  path?: string;
  noIndex?: boolean;
};

function setMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Client-side SEO for an SPA route: keeps the document title, meta description,
 * canonical URL, and the title/url social tags in sync with the active page.
 * Build-time route HTML provides the same metadata for non-JavaScript readers;
 * this hook keeps it synchronized after client-side navigation.
 */
export function useSeo({
  title,
  description,
  path = "/",
  noIndex = false,
}: SeoOptions) {
  useEffect(() => {
    const fullTitle = title ?? DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${path}`;
    const social = socialMetadata(path);
    setMeta('meta[property="og:type"]', "property", "og:type", social.type);
    setMeta('meta[property="og:image"]', "property", "og:image", social.image);
    setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", social.alt);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", social.image);
    setMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", social.alt);

    document.title = fullTitle;
    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
      desc,
    );
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      desc,
    );
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex ? "noindex, follow" : "index, follow",
    );
    setCanonical(url);
  }, [title, description, path, noIndex]);
}
