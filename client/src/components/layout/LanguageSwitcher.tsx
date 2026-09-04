import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n";

/** User-panel language switcher — persists to localStorage via i18next-browser-languagedetector. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu
      align="end"
      trigger={
        <button
          type="button"
          aria-label={t("topbar.language")}
          className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-sm text-muted-foreground transition-colors hover:bg-blue/[0.08] hover:text-foreground"
        >
          <Globe className="size-4" />
          <span className="hidden sm:inline">{current.label}</span>
        </button>
      }
    >
      {() => (
        <>
          <DropdownMenuLabel>{t("topbar.language")}</DropdownMenuLabel>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem key={lang.code} onSelect={() => void i18n.changeLanguage(lang.code)}>
              <span className="flex-1">{lang.label}</span>
              {lang.code === current.code && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </DropdownMenu>
  );
}
