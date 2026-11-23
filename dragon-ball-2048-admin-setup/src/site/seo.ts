import { useEffect } from 'react';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Updates the document title, meta description, canonical URL, Open Graph tags and robots directive for the
 * current route. The canonical URL is built from the live origin, so no domain has to be hard-coded.
 */
export function useSeo(opts: { title: string; description: string; path: string; noindex?: boolean }) {
  const { title, description, path, noindex } = opts;
  useEffect(() => {
    document.title = title;
    const url = window.location.origin + (path === '/' ? '/' : path);
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex,follow' : 'index,follow');

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (noindex) {
      link?.remove();
    } else {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = url;
    }
  }, [title, description, path, noindex]);
}
