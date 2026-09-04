import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background bg-depth p-4 text-center">
      <p className="text-6xl font-extrabold text-primary sm:text-7xl">404</p>
      <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t("notFound.description")}
      </p>
      <Button asChild>
        <Link to="/">{t("notFound.backHome")}</Link>
      </Button>
    </div>
  );
}