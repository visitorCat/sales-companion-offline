"use client";

import { useAppStore } from "@/store/app-store";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function ScreenHeader({
  title,
  subtitle,
  right,
  showBack = true,
  sticky = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showBack?: boolean;
  sticky?: boolean;
}) {
  const t = useT();
  const back = useAppStore((s) => s.back);
  const canGoBack = useAppStore((s) => s.history.length > 0);
  return (
    <header
      className={cn(
        "z-20 bg-background/85 backdrop-blur-md border-b",
        sticky && "sticky top-0"
      )}
    >
      <div className="flex items-center gap-2 px-4 h-14 pt-safe">
        {showBack && canGoBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ms-1 tap-scale"
            onClick={back}
            aria-label={t("back")}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 mb-2 mt-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-3">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
