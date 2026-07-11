"use client";

import { useMemo, useState, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { formatCurrency } from "@/lib/format";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Package, Star, AlertTriangle, XCircle, CheckCircle2, Settings, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductAvailability } from "@/lib/types";

const availConfig: Record<ProductAvailability, { label: string; cls: string; icon: typeof Star }> = {
  AVAILABLE: { label: "available", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  LOW: { label: "lowStock", cls: "bg-amber-500/15 text-amber-600", icon: AlertTriangle },
  OUT: { label: "outOfStock", cls: "bg-rose-500/15 text-rose-600", icon: XCircle },
};

export function ProductsScreen() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const { products, categories } = useDataStore();
  const [query, setQuery] = useState("");
  const [catId, setCatId] = useState<string>("all");
  const importProductsInput = useRef<HTMLInputElement>(null);

  function exportProducts() {
    const rows: string[][] = [];
    rows.push(["Name", "SKU", "Barcode", "Category", "Price", "Package", "Availability", "Description", "Image"]);
    for (const p of products) {
      const cat = categories.find(c => c.id === p.categoryId);
      rows.push([
        p.name, p.sku ?? "", p.barcode ?? "", cat?.name ?? "",
        String(p.sellingPrice), String(p.packageSize), p.availability,
        p.description ?? "", p.imageUrl ?? "",
      ]);
    }
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportDone"));
  }

  async function handleImportProducts(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error(t("error")); return; }
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
      let imported = 0;
      const { createProduct, updateProduct } = await import("@/lib/dexie-data");
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
        const name = cells[headers.indexOf("name")] || cells[0] || "";
        if (!name) continue;
        if (products.some(p => p.name.toLowerCase() === name.toLowerCase())) continue;
        const catName = cells[headers.indexOf("category")] || "";
        const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        const price = parseFloat(cells[headers.indexOf("price")]) || 0;
        const pkg = parseInt(cells[headers.indexOf("package")]) || 1;
        const avail = cells[headers.indexOf("availability")] || "AVAILABLE";
        const desc = cells[headers.indexOf("description")] || null;
        const image = cells[headers.indexOf("image")] || null;
        const sku = cells[headers.indexOf("sku")] || null;
        const barcode = cells[headers.indexOf("barcode")] || null;
        const created = await createProduct({
          name, sku, barcode, categoryId: cat?.id ?? categories[0]?.id ?? "",
          sellingPrice: price, packageSize: pkg, cartonsPerCase: 1,
          availability: (["AVAILABLE", "LOW", "OUT"].includes(avail) ? avail : "AVAILABLE") as any,
          imageUrl: image, description: desc, isFavorite: false,
        });
        useDataStore.getState().upsertProduct(created);
        imported++;
      }
      toast.success(`${imported} ${t("product")}`);
      window.dispatchEvent(new Event("focus"));
    } catch { toast.error(t("error")); }
    e.target.value = "";
  }

  const filtered = useMemo(() => {
    return products
      .filter((p) => (catId === "all" ? true : p.categoryId === catId))
      .filter((p) =>
        !query.trim()
          ? true
          : p.name.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => a.order - b.order);
  }, [products, catId, query]);

  return (
    <div className="min-h-dynamic">
      <ScreenHeader
        title={t("products")}
        subtitle={`${filtered.length} ${t("product")}`}
        showBack={false}
        right={
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="tap-scale text-xs" onClick={exportProducts}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="tap-scale text-xs" onClick={() => importProductsInput.current?.click()}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="tap-scale" onClick={() => go("productManage", {})}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <input
        ref={importProductsInput}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={handleImportProducts}
      />

      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchProducts")}
            className="h-11 ps-9 rounded-xl bg-muted/60 border-0"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <CatChip active={catId === "all"} onClick={() => setCatId("all")} label={t("all")} />
          {categories.map((c) => (
            <CatChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)} label={c.name} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package className="h-6 w-6" />} title={t("noProducts")} hint={t("noResults")} />
      ) : (
        <div className="px-4 pt-3 grid grid-cols-2 gap-3 pb-28">
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            const avail = availConfig[p.availability];
            const AvailIcon = avail.icon;
            return (
              <Card key={p.id} className={cn("p-3 flex flex-col", p.availability === "OUT" && "opacity-60")}>
                <div className="aspect-square rounded-xl bg-gradient-to-br from-muted to-muted/50 grid place-items-center mb-2 relative">
                  <Package className="h-8 w-8 text-muted-foreground/60" />
                  {p.isFavorite && (
                    <Star className="absolute top-1.5 end-1.5 h-4 w-4 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <p className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{cat?.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-primary">{formatCurrency(p.sellingPrice)}</span>
                  <span className="text-[10px] text-muted-foreground">{p.packageSize}u</span>
                </div>
                <Badge className={cn("mt-2 justify-center text-[10px] font-medium", avail.cls)}>
                  <AvailIcon className="h-3 w-3 me-1" />
                  {t(avail.label)}
                </Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CatChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 h-9 px-3.5 rounded-full text-xs font-medium border transition-colors tap-scale whitespace-nowrap",
        active ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"
      )}
    >
      {label}
    </button>
  );
}
