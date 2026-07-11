"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search, X, Users, Package, MapPin, Phone, StickyNote, ChevronRight, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SearchScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const go = useAppStore((s) => s.go);
  const back = useAppStore((s) => s.back);
  const { customers, products, areas, sectors, notes } = useDataStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { customers: [], products: [], areas: [], notes: [] };
    return {
      customers: customers
        .filter((c) =>
          c.shopName.toLowerCase().includes(q) ||
          c.owner.toLowerCase().includes(q) ||
          c.phone.includes(q.replace(/\s/g, ""))
        )
        .slice(0, 8),
      products: products
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 6),
      areas: areas
        .filter((a) => a.name.toLowerCase().includes(q))
        .slice(0, 6),
      notes: notes
        .filter((n) => n.content.toLowerCase().includes(q))
        .slice(0, 5),
    };
  }, [query, customers, products, areas, notes]);

  const total = results.customers.length + results.products.length + results.areas.length + results.notes.length;

  return (
    <div className="min-h-dynamic">
      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b pt-safe">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={back} className="text-sm text-muted-foreground tap-scale p-1">
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full h-11 ps-9 pe-9 rounded-xl bg-muted/60 border-0 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {query && (
          <p className="px-4 pb-2 text-xs text-muted-foreground">{total} {t("results")}</p>
        )}
      </div>

      {!query ? (
        <div className="px-4 pt-8">
          <div className="grid grid-cols-2 gap-3">
            <ShortcutCard icon={Users} label={t("customers")} color="text-primary bg-primary/10" onClick={() => go("customers", {})} />
            <ShortcutCard icon={Package} label={t("products")} color="text-amber-600 bg-amber-500/10" onClick={() => go("products", {})} />
            <ShortcutCard icon={MapPin} label={t("map")} color="text-emerald-600 bg-emerald-500/10" onClick={() => go("map", {})} />
            <ShortcutCard icon={ShoppingBag} label={t("newOrder")} color="text-rose-600 bg-rose-500/10" onClick={() => customers[0] && go("order", { customerId: customers[0].id, returnTo: "search" })} />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">{t("searchPlaceholder")}</p>
        </div>
      ) : total === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title={t("noResults")} hint={query} />
      ) : (
        <div className="px-4 pt-3 pb-8 space-y-4">
          {results.customers.length > 0 && (
            <ResultGroup title={t("customers")} icon={Users} count={results.customers.length}>
              {results.customers.map((c) => {
                const area = areas.find((a) => a.id === c.areaId);
                const sector = sectors.find((s) => s.id === c.sectorId);
                return (
                  <ResultRow
                    key={c.id}
                    onClick={() => go("customer", { customerId: c.id, returnTo: "search" })}
                    avatar={c.shopName[0]?.toUpperCase()}
                    title={c.shopName}
                    subtitle={`${c.owner} • ${sector?.code ?? ""} ${area?.name ?? ""}`}
                    badge={c.rating}
                  />
                );
              })}
            </ResultGroup>
          )}

          {results.products.length > 0 && (
            <ResultGroup title={t("products")} icon={Package} count={results.products.length}>
              {results.products.map((p) => {
                const cat = useDataStore.getState().categories.find((c) => c.id === p.categoryId);
                return (
                  <ResultRow
                    key={p.id}
                    onClick={() => {
                      if (customers[0]) go("order", { customerId: customers[0].id, returnTo: "search" });
                    }}
                    icon={<Package className="h-4 w-4 text-amber-600" />}
                    title={p.name}
                    subtitle={cat?.name ?? ""}
                    badge={p.availability === "OUT" ? "OUT" : p.availability === "LOW" ? "LOW" : undefined}
                  />
                );
              })}
            </ResultGroup>
          )}

          {results.areas.length > 0 && (
            <ResultGroup title={t("area")} icon={MapPin} count={results.areas.length}>
              {results.areas.map((a) => {
                const sector = sectors.find((s) => s.id === a.sectorId);
                const count = customers.filter((c) => c.areaId === a.id).length;
                return (
                  <ResultRow
                    key={a.id}
                    onClick={() => go("customers", {})}
                    icon={<MapPin className="h-4 w-4 text-emerald-600" />}
                    title={a.name}
                    subtitle={`${sector?.code ?? ""} • ${count} ${t("customers")}`}
                  />
                );
              })}
            </ResultGroup>
          )}

          {results.notes.length > 0 && (
            <ResultGroup title={t("notes")} icon={StickyNote} count={results.notes.length}>
              {results.notes.map((n) => {
                const c = customers.find((x) => x.id === n.customerId);
                return (
                  <ResultRow
                    key={n.id}
                    onClick={() => c && go("customer", { customerId: c.id, returnTo: "search" })}
                    icon={<StickyNote className="h-4 w-4 text-amber-500" />}
                    title={n.content.slice(0, 60) + (n.content.length > 60 ? "…" : "")}
                    subtitle={c?.shopName ?? t("personalNote")}
                  />
                );
              })}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

function ShortcutCard({ icon: Icon, label, color, onClick }: { icon: typeof Users; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="tap-scale">
      <Card className="p-4 flex flex-col items-center gap-2 hover:bg-muted/40 transition-colors">
        <div className={cn("h-11 w-11 rounded-xl grid place-items-center", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </Card>
    </button>
  );
}

function ResultGroup({ title, icon: Icon, count, children }: { title: string; icon: typeof Users; count: number; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5 px-1">
        <Icon className="h-3.5 w-3.5" /> {title} <span className="text-muted-foreground/60">({count})</span>
      </p>
      <Card className="divide-y divide-border">
        {children}
      </Card>
    </div>
  );
}

function ResultRow({ onClick, avatar, icon, title, subtitle, badge }: {
  onClick: () => void; avatar?: string; icon?: React.ReactNode; title: string; subtitle?: string; badge?: string;
}) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors tap-scale text-start"
    >
      {avatar ? (
        <div className="h-9 w-9 rounded-xl bg-muted grid place-items-center text-sm font-bold text-muted-foreground shrink-0">
          {avatar}
        </div>
      ) : icon ? (
        <div className="h-9 w-9 rounded-xl bg-muted/60 grid place-items-center shrink-0">{icon}</div>
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {badge && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          badge === "A" ? "bg-emerald-500 text-white" : badge === "B" ? "bg-amber-500 text-white" : badge === "C" ? "bg-zinc-400 text-white" : "bg-muted text-muted-foreground"
        )}>{badge}</span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
    </motion.button>
  );
}
