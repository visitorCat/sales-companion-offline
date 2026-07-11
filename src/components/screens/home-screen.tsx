"use client";

import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Route as RouteIcon, Search, UserPlus, Plus,
} from "lucide-react";

export function HomeScreen() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const startRoute = useAppStore((s) => s.startRoute);
  const route = useAppStore((s) => s.route);
  const { customers } = useDataStore();

  function handleStartRoute() {
    const ids = customers
      .filter((c) => c.active)
      .sort((a, b) => a.visitOrder - b.visitOrder)
      .map((c) => c.id);
    if (ids.length === 0) {
      go("route", {});
      return;
    }
    startRoute(ids);
    go("route", {});
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <header className="px-4 pt-safe">
        <div className="flex items-center justify-between pt-3 pb-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("todaysWork")}</p>
            <h1 className="text-xl font-bold tracking-tight">
              {useDataStore.getState().rep?.name?.split(" ")[0] ?? t("appName")} 👋
            </h1>
          </div>
        </div>
      </header>

      {/* Quick actions — only 4 buttons */}
      <section className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-16 text-base font-semibold rounded-2xl tap-scale shadow-md shadow-primary/20"
            onClick={handleStartRoute}
          >
            <RouteIcon className="h-5 w-5 me-2" />
            {route.startedAt ? t("nextCustomer") : t("startRoute")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-base font-semibold rounded-2xl tap-scale"
            onClick={() => go("search", { returnTo: "home" })}
          >
            <Search className="h-5 w-5 me-2" />
            {t("search")}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Button
            variant="secondary"
            className="h-12 rounded-2xl tap-scale"
            onClick={() => go("newCustomer", { returnTo: "home" })}
          >
            <UserPlus className="h-4 w-4 me-2" />
            {t("newCustomer")}
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-2xl tap-scale"
            onClick={() => customers[0] && go("order", { customerId: customers[0].id, returnTo: "home" })}
          >
            <Plus className="h-4 w-4 me-2" />
            {t("newOrder")}
          </Button>
        </div>
      </section>
    </div>
  );
}
