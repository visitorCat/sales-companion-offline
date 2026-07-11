"use client";

import { useMemo, useState, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats, customerStatus, lastVisitOf, lastOrderOf } from "@/lib/stats";
import { customerSegment, type SegmentId } from "@/lib/segmentation";
import { timeAgo } from "@/lib/format";
import type { CustomerRating, CustomerType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import {
  Phone, MessageCircle, Navigation, ShoppingBag, ChevronRight,
  SlidersHorizontal, Search, Star, MapPin, UserPlus, Search as SearchIcon,
  Download, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ratingColors: Record<CustomerRating, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-zinc-400 text-white",
};

export function CustomersScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const go = useAppStore((s) => s.go);
  const { customers, sectors, areas, orders, visits, objective, rep } = useDataStore();
  const [query, setQuery] = useState("");
  const [sectorId, setSectorId] = useState<string>("all");
  const [areaId, setAreaId] = useState<string>("all");
  const [rating, setRating] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [segment, setSegment] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  const filtered = useMemo(() => {
    return customers
      .filter((c) => c.active)
      .filter((c) => (sectorId === "all" ? true : c.sectorId === sectorId))
      .filter((c) => (areaId === "all" ? true : c.areaId === areaId))
      .filter((c) => (rating === "all" ? true : c.rating === rating))
      .filter((c) => {
        if (status === "all") return true;
        const s = customerStatus(c, stats);
        return s === status;
      })
      .filter((c) => {
        if (segment === "all") return true;
        return customerSegment(c, orders) === segment;
      })
      .filter((c) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          c.shopName.toLowerCase().includes(q) ||
          c.owner.toLowerCase().includes(q) ||
          c.phone.includes(q)
        );
      })
      .sort((a, b) => a.visitOrder - b.visitOrder);
  }, [customers, sectorId, areaId, rating, status, segment, query, stats, orders]);

  const areasForSector = areas.filter((a) => sectorId === "all" || a.sectorId === sectorId);
  const activeFilters = [sectorId, areaId, rating, status, segment].filter((x) => x !== "all").length;

  const importCustomersInput = useRef<HTMLInputElement>(null);

  function exportCustomers() {
    const rows: string[][] = [];
    rows.push(["Shop Name", "Owner", "Phone", "Type", "Sector", "Area", "Rating", "Address", "Lat", "Lng", "Visit Order", "Notes"]);
    for (const c of customers.filter(c => c.active)) {
      const sector = sectors.find(s => s.id === c.sectorId);
      const area = areas.find(a => a.id === c.areaId);
      rows.push([
        c.shopName, c.owner, c.phone, c.type,
        sector?.code ?? "", area?.name ?? "",
        c.rating, c.address ?? "", String(c.lat ?? ""), String(c.lng ?? ""),
        String(c.visitOrder), "",
      ]);
    }
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportDone"));
  }

  async function handleImportCustomers(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error(t("error")); return; }
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
      let imported = 0;
      const { createCustomer } = await import("@/lib/dexie-data");
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
        const shopName = cells[headers.indexOf("shop name")] || cells[0] || "";
        if (!shopName) continue;
        // Check for duplicates by phone
        const phone = cells[headers.indexOf("phone")] || cells[2] || "";
        if (phone && customers.some(c => c.phone === phone)) continue;
        const owner = cells[headers.indexOf("owner")] || cells[1] || shopName;
        const sectorCode = cells[headers.indexOf("sector")] || "";
        const sector = sectors.find(s => s.code.toLowerCase() === sectorCode.toLowerCase());
        const areaName = cells[headers.indexOf("area")] || "";
        const area = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase() && (!sector || a.sectorId === sector.id));
        const rating = (cells[headers.indexOf("rating")] || "C") as "A" | "B" | "C";
        const lat = parseFloat(cells[headers.indexOf("lat")]) || null;
        const lng = parseFloat(cells[headers.indexOf("lng")]) || null;
        const address = cells[headers.indexOf("address")] || null;
        const created = await createCustomer({
          shopName, owner, phone, type: "GROCERY",
          sectorId: sector?.id ?? sectors[0]?.id ?? "",
          areaId: area?.id ?? areas[0]?.id ?? "",
          repId: rep?.id ?? null,
          rating: (["A", "B", "C"].includes(rating) ? rating : "C") as any,
          lat: isNaN(lat as number) ? null : lat, lng: isNaN(lng as number) ? null : lng,
          address, visitOrder: customers.length + imported,
        });
        useDataStore.getState().upsertCustomer({
          id: created.id, shopName: created.shopName, owner: created.owner,
          phone: created.phone, type: created.type as CustomerType,
          sectorId: created.sectorId, areaId: created.areaId, repId: created.repId,
          rating: created.rating as CustomerRating, lat: created.lat, lng: created.lng,
          address: created.address, lastVisitAt: null, lastOrderAt: null,
          visitOrder: created.visitOrder, active: true,
        });
        imported++;
      }
      toast.success(`${imported} ${t("customers")}`);
      window.dispatchEvent(new Event("focus"));
    } catch { toast.error(t("error")); }
    e.target.value = "";
  }

  function clearFilters() {
    setSectorId("all"); setAreaId("all"); setRating("all"); setStatus("all"); setSegment("all");
  }

  function call(phone: string) {
    window.location.assign(`tel:${phone}`);
  }
  function whatsapp(phone: string) {
    const n = phone.replace(/[^0-9]/g, "").replace(/^0/, "213");
    window.open(`https://wa.me/${n}`, "_blank");
  }
  function navigate(lat: number | null, lng: number | null) {
    if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }

  return (
    <div className="min-h-dynamic">
      <ScreenHeader
        title={t("customers")}
        subtitle={`${filtered.length} ${t("customerCount")}`}
        right={
          <Button variant="ghost" size="icon" className="tap-scale" onClick={() => go("newCustomer", { returnTo: "customers" })}>
            <UserPlus className="h-5 w-5" />
          </Button>
        }
        showBack={false}
      />

      {/* Search + filter */}
      <div className="px-4 pt-3 flex gap-2 sticky top-14 z-10 bg-background/85 backdrop-blur pb-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full h-11 ps-9 pe-3 rounded-xl bg-muted/60 border-0 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl relative tap-scale">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilters > 0 && (
                <span className="absolute -top-1 -end-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                  {activeFilters}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto scroll-thin">
            <SheetHeader>
              <SheetTitle>{t("filter")}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-1 pb-6">
              <FilterField label={t("filterBySector")}>
                <Select value={sectorId} onValueChange={setSectorId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("filterByArea")}>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    {areasForSector.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label={t("filterByRating")}>
                <div className="flex gap-2">
                  {["all", "A", "B", "C"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRating(r)}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-sm font-semibold border transition-colors tap-scale",
                        rating === r ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {r === "all" ? t("all") : r}
                    </button>
                  ))}
                </div>
              </FilterField>
              <FilterField label={t("visitStatus")}>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "all", l: t("all") },
                    { v: "visited", l: t("visited") },
                    { v: "ordered", l: t("ordered") },
                    { v: "notVisited", l: t("notVisited") },
                  ].map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setStatus(s.v)}
                      className={cn(
                        "h-10 rounded-xl text-sm font-medium border transition-colors tap-scale",
                        status === s.v ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </FilterField>
              <FilterField label={t("customerSegments")}>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "all", l: t("all") },
                    { v: "vip", l: t("vip") },
                    { v: "regular", l: t("regular") },
                    { v: "occasional", l: t("occasional") },
                    { v: "at_risk", l: t("atRisk") },
                    { v: "new", l: t("newCustomers") },
                    { v: "inactive", l: t("inactive") },
                  ].map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setSegment(s.v)}
                      className={cn(
                        "h-10 rounded-xl text-sm font-medium border transition-colors tap-scale",
                        segment === s.v ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </FilterField>
              {activeFilters > 0 && (
                <Button variant="ghost" className="w-full" onClick={clearFilters}>
                  {t("clearFilters")}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Import / Export */}
      <div className="px-4 pt-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl tap-scale text-xs flex-1"
          onClick={exportCustomers}
        >
          <Download className="h-3.5 w-3.5 me-1" /> {t("exportCustomers") || "Export"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl tap-scale text-xs flex-1"
          onClick={() => importCustomersInput.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 me-1" /> {t("importCustomers") || "Import"}
        </Button>
        <input
          ref={importCustomersInput}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={handleImportCustomers}
        />
      </div>

      {/* Quick segment chips */}
      <div className="px-4 pt-2 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { v: "all", l: t("all"), c: "bg-muted text-foreground" },
          { v: "vip", l: t("vip"), c: "bg-amber-500/15 text-amber-600" },
          { v: "at_risk", l: t("atRisk"), c: "bg-rose-500/15 text-rose-600" },
          { v: "regular", l: t("regular"), c: "bg-emerald-500/15 text-emerald-600" },
          { v: "new", l: t("newCustomers"), c: "bg-violet-500/15 text-violet-600" },
          { v: "occasional", l: t("occasional"), c: "bg-sky-500/15 text-sky-600" },
          { v: "inactive", l: t("inactive"), c: "bg-zinc-500/15 text-zinc-500" },
        ].map((s) => (
          <button
            key={s.v}
            onClick={() => setSegment(s.v)}
            className={cn(
              "shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition-colors tap-scale whitespace-nowrap",
              segment === s.v ? "bg-primary text-primary-foreground border-primary" : cn("border-transparent", s.c)
            )}
          >
            {s.l}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon className="h-6 w-6" />} title={t("noCustomers")} hint={t("noResults")} />
      ) : (
        <div className="px-4 space-y-2 pb-4">
          {filtered.map((c, i) => {
            const st = customerStatus(c, stats);
            const lv = lastVisitOf(c.id, visits);
            const lo = lastOrderOf(c.id, orders);
            const areaName = areas.find((a) => a.id === c.areaId)?.name ?? "—";
            const sectorCode = sectors.find((s) => s.id === c.sectorId)?.code ?? "";
            const seg = customerSegment(c, orders);
            const segColors: Record<string, string> = {
              vip: "bg-amber-500/15 text-amber-600",
              regular: "bg-emerald-500/15 text-emerald-600",
              occasional: "bg-sky-500/15 text-sky-600",
              at_risk: "bg-rose-500/15 text-rose-600",
              new: "bg-violet-500/15 text-violet-600",
              inactive: "bg-zinc-500/15 text-zinc-500",
            };
            const segLabels: Record<string, string> = {
              vip: t("vip"), regular: t("regular"), occasional: t("occasional"),
              at_risk: t("atRisk"), new: t("newCustomers"), inactive: t("inactive"),
            };
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
              >
                <Card
                  className={cn(
                    "p-3 tap-scale cursor-pointer transition-colors hover:bg-muted/40",
                    st === "ordered" && "ring-1 ring-primary/40"
                  )}
                  onClick={() => go("customer", { customerId: c.id, returnTo: "customers" })}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-11 w-11 rounded-xl bg-muted grid place-items-center text-sm font-bold text-muted-foreground">
                        {c.shopName[0]?.toUpperCase()}
                      </div>
                      <span className={cn(
                        "absolute -top-1 -end-1 h-5 w-5 rounded-full grid place-items-center text-[10px] font-bold",
                        ratingColors[c.rating]
                      )}>
                        {c.rating}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{c.shopName}</p>
                        {st === "ordered" && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        {st === "visited" && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                        <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded-full shrink-0", segColors[seg])}>
                          {segLabels[seg]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.owner} • {sectorCode} {areaName}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        {t("lastVisit")}: {lv ? timeAgo(lv.createdAt, lang) : "—"}
                        {lo && <span className="ms-2">• {t("order")}: {timeAgo(lo.createdAt, lang)}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); call(c.phone); }}
                        className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 grid place-items-center tap-scale"
                        aria-label={t("call")}
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); go("order", { customerId: c.id, returnTo: "customers" }); }}
                        className="h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center tap-scale"
                        aria-label={t("order")}
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2 pt-2 border-t">
                    <button
                      onClick={(e) => { e.stopPropagation(); whatsapp(c.phone); }}
                      className="flex-1 h-8 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground flex items-center justify-center gap-1 tap-scale"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> {t("whatsapp")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(c.lat, c.lng); }}
                      className="flex-1 h-8 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground flex items-center justify-center gap-1 tap-scale"
                    >
                      <Navigation className="h-3.5 w-3.5" /> {t("navigate")}
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
