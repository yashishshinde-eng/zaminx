import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li>
                {item.to && !isLast ? (
                  <Link to={item.to} className="hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn(isLast && "font-medium text-foreground")}>{item.label}</span>
                )}
              </li>
              {!isLast && (
                <li aria-hidden>
                  <ChevronRight className="size-4 shrink-0" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}