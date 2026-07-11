"use client";

import { useAppStore, type ScreenName } from "@/store/app-store";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { Home, Users, Package, BarChart3, Settings } from "lucide-react";

const NAV: { screen: ScreenName; key: string; icon: typeof Home }[] = [
  { screen: "home", key: "home", icon: Home },
  { screen: "customers", key: "customers", icon: Users },
  { screen: "products", key: "products", icon: Package },
  { screen: "dashboard", key: "dashboard", icon: BarChart3 },
  { screen: "settings", key: "settings", icon: Settings },
];

export function BottomNav() {
  const t = useT();
  const screen = useAppStore((s) => s.screen);
  const go = useAppStore((s) => s.go);
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-md pb-safe">
      <div className="grid grid-cols-5 h-16">
        {NAV.map((item) => {
          const active =
            screen === item.screen ||
            (item.screen === "customers" && (screen === "customer" || screen === "newCustomer")) ||
            (item.screen === "dashboard" && (screen === "reports" || screen === "endOfDay"));
          const Icon = item.icon;
          return (
            <button
              key={item.screen}
              onClick={() => go(item.screen, {})}
              className="flex flex-col items-center justify-center gap-0.5 tap-scale relative"
              aria-label={t(item.key)}
            >
              {active && (
                <span className="absolute top-0 h-1 w-8 rounded-b-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {t(item.key)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
