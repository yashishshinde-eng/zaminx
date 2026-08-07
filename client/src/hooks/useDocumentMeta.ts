import { useEffect } from "react";

interface DocumentMeta {
  title?: string;
  description?: string;
}

const DEFAULT_TITLE = "Zeminex";

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Sets document title + meta description + Open Graph tags. Call from any page. */
export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    document.title = fullTitle;
    upsertMeta('meta[name="description"]', "name", "description", description ?? "");
    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description ?? "");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description ?? "");
  }, [title, description]);
}