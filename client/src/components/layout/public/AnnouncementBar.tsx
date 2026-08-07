import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import type { SiteConfig } from "@zeminex/shared";

const STORAGE_KEY = "zeminex.announcement.dismissed";

export function AnnouncementBar({ bar }: { bar: SiteConfig["announcementBar"] }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!bar.enabled) return;
    const sig = `${bar.message}|${bar.linkLabel ?? ""}`;
    if (localStorage.getItem(STORAGE_KEY) === sig) setDismissed(true);
  }, [bar]);

  if (!bar.enabled || dismissed || !bar.message) return null;

  const dismiss = () => {
    const sig = `${bar.message}|${bar.linkLabel ?? ""}`;
    localStorage.setItem(STORAGE_KEY, sig);
    setDismissed(true);
  };

  return (
    <div className="relative gradient-blue px-4 py-2 text-center text-sm text-primary-foreground">
      <span>
        {bar.message}
        {bar.link && bar.linkLabel && (
          <Link to={bar.link} className="ml-2 font-semibold underline underline-offset-2">
            {bar.linkLabel}
          </Link>
        )}
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-foreground/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}