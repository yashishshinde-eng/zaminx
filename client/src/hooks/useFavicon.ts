import { useEffect } from "react";
import { useSiteConfig } from "@/hooks/useSiteConfig";

/** Applies the admin-configured favicon (`cms.faviconUrl`) to the document
 *  head once site config loads. Falls back to the static `index.html` icon
 *  when no favicon has been uploaded. Mount once near the app root. */
export function useFavicon() {
  const { data: config } = useSiteConfig();

  useEffect(() => {
    if (!config?.faviconUrl) return;
    let link = document.head.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.removeAttribute("type"); // let the browser sniff png/ico/svg
    link.href = config.faviconUrl;
  }, [config?.faviconUrl]);
}
