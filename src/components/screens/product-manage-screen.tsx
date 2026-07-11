"use client";

import { useState, useRef } from "react";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { formatCurrency } from "@/lib/format";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Package, Search, Star, AlertTriangle, XCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductT, ProductAvailability } from "@/lib/types";

const availConfig: Record<ProductAvailability, { label: string; cls: string; icon: typeof Star }> = {
  AVAILABLE: { label: "available", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  LOW: { label: "lowStock", cls: "bg-amber-500/15 text-amber-600", icon: AlertTriangle },
  OUT: { label: "outOfStock", cls: "bg-rose-500/15 text-rose-600", icon: XCircle },
};

export function ProductManageScreen() {
  const t = useT();
  const lang = (t as unknown as string) || "fr";
  const { products, categories, upsertProduct } = useDataStore();
  const [query, setQuery] = useState("");
  const [catId, setCatId] = useState<string>("all");
  const [editing, setEditing] = useState<ProductT | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = products
    .filter((p) => (catId === "all" ? true : p.categoryId === catId))
    .filter((p) => (!query.trim() ? true : p.name.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => a.order - b.order);

  function openAdd() { setEditing(null); setShowForm(true); }
  function openEdit(p: ProductT) { setEditing(p); setShowForm(true); }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { deleteProduct } = await import("@/lib/dexie-data");
      await deleteProduct(deleteId);
      toast.success(t("productDeleted"));
      const ds = useDataStore.getState();
      useDataStore.setState({ products: ds.products.filter((p) => p.id !== deleteId) });
    } catch { toast.error(t("error")); }
    setDeleteId(null);
  }

  return (
    <div className="min-h-dynamic pb-28">
      <ScreenHeader title={t("manageProducts")} subtitle={`${products.length} ${t("product")}`} right={<Button variant="ghost" size="icon" className="tap-scale" onClick={openAdd}><Plus className="h-5 w-5"/></Button>} showBack={false} />
      <div className="px-4 pt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchProducts")} className="w-full h-11 ps-9 pe-3 rounded-xl bg-muted/60 border-0 text-sm focus:ring-2 focus:ring-primary outline-none"/>
        </div>
        <Select value={catId} onValueChange={setCatId}>
          <SelectTrigger className="w-32 h-11 rounded-xl"><SelectValue/></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<Package className="h-6 w-6"/>} title={t("noProducts")}/>
      ) : (
        <div className="px-4 pt-3 space-y-2">
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            const avail = availConfig[p.availability];
            const AvailIcon = avail.icon;
            return (
              <Card key={p.id} className="p-3 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 grid place-items-center shrink-0 overflow-hidden">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded-xl object-cover"/> : <Package className="h-6 w-6 text-muted-foreground/60"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0"/>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{cat?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-primary">{formatCurrency(p.sellingPrice, lang)}</span>
                    <Badge className={cn("text-[9px] border-0", avail.cls)}><AvailIcon className="h-2.5 w-2.5 me-0.5"/>{t(avail.label)}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center tap-scale"><Pencil className="h-4 w-4"/></button>
                  <button onClick={() => setDeleteId(p.id)} className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center tap-scale"><Trash2 className="h-4 w-4"/></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ProductFormDialog open={showForm} onOpenChange={setShowForm} product={editing} categories={categories} onSave={async (data) => {
        setSaving(true);
        try {
          const dexie = await import("@/lib/dexie-data");
          if (editing) { await dexie.updateProduct(editing.id, data); upsertProduct({ ...editing, ...data }); toast.success(t("productSaved")); setShowForm(false); }
          else { const created = await dexie.createProduct({ name: data.name, sku: data.sku ?? null, barcode: data.barcode ?? null, categoryId: data.categoryId, sellingPrice: data.sellingPrice, packageSize: data.packageSize ?? 1, cartonsPerCase: 1, availability: data.availability ?? "AVAILABLE", imageUrl: data.imageUrl ?? null, description: data.description ?? null, isFavorite: data.isFavorite ?? false }); upsertProduct(created); toast.success(t("productSaved")); setShowForm(false); }
        } catch { toast.error(t("error")); }
        setSaving(false);
      }} saving={saving}/>
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("confirmDeleteProduct")}</AlertDialogTitle><AlertDialogDescription>{t("cannotDelete")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductFormDialog({ open, onOpenChange, product, categories, onSave, saving }: { open: boolean; onOpenChange: (v: boolean) => void; product: ProductT | null; categories: { id: string; name: string }[]; onSave: (data: any) => void; saving: boolean; }) {
  const t = useT();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.sellingPrice ?? ""));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [availability, setAvailability] = useState<ProductAvailability>(product?.availability ?? "AVAILABLE");
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [description, setDescription] = useState(product?.description ?? "");
  const [packageSize, setPackageSize] = useState(String(product?.packageSize ?? 1));
  const [isFavorite, setIsFavorite] = useState(product?.isFavorite ?? false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { toast.error(t("error")); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const img = new Image(); img.onload = () => { const canvas = document.createElement("canvas"); const max = 300; let w = img.width, h = img.height; if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0, w, h); setImageUrl(canvas.toDataURL("image/jpeg", 0.8)); }; img.src = ev.target?.result as string; };
    reader.readAsDataURL(file); e.target.value = "";
  }

  function handleSubmit() { if (!name.trim() || !price) return; onSave({ name: name.trim(), sellingPrice: parseFloat(price), categoryId, availability, imageUrl: imageUrl || null, description: description.trim() || null, packageSize: parseInt(packageSize) || 1, isFavorite }); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle>{product ? t("editProduct") : t("addProduct")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("productName")} *</Label><Input className="mt-1 h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("productName")}/></div>
          <div className="grid grid-cols-2 gap-2"><div><Label>{t("productPrice")} *</Label><Input className="mt-1 h-11" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" inputMode="decimal"/></div><div><Label>{t("productPackage")}</Label><Input className="mt-1 h-11" type="number" value={packageSize} onChange={(e) => setPackageSize(e.target.value)} placeholder="1" inputMode="numeric"/></div></div>
          <div><Label>{t("productCategory")}</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="mt-1 h-11"><SelectValue/></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{t("productAvailability")}</Label><div className="grid grid-cols-3 gap-2 mt-1">{(["AVAILABLE","LOW","OUT"] as ProductAvailability[]).map((a) => { const cfg = availConfig[a]; const Icon = cfg.icon; return (<button key={a} onClick={() => setAvailability(a)} className={cn("h-10 rounded-xl text-xs font-medium border-2 transition-colors tap-scale flex items-center justify-center gap-1", availability === a ? cn("border-primary", cfg.cls) : "border-border")}><Icon className="h-3 w-3"/> {t(cfg.label)}</button>); })}</div></div>
          <div><Label>{t("productImage")}</Label><div className="mt-1 flex items-center gap-3">
            <div className="h-16 w-16 rounded-xl bg-muted grid place-items-center shrink-0 overflow-hidden border-2 border-border">{imageUrl ? <img src={imageUrl} alt="preview" className="h-full w-full object-cover"/> : <Package className="h-6 w-6 text-muted-foreground/50"/>}</div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg tap-scale text-xs" onClick={() => fileInputRef.current?.click()}><Upload className="h-3.5 w-3.5 me-1"/>{imageUrl ? t("editProduct") : t("addProduct")}</Button>
              {imageUrl && <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg tap-scale text-xs text-destructive" onClick={() => setImageUrl(null)}><Trash2 className="h-3.5 w-3.5 me-1"/>{t("remove")}</Button>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect}/>
          </div></div>
          <div><Label>{t("description")} ({t("optional")})</Label><Textarea className="mt-1 min-h-16 resize-none" value={description} onChange={(e) => setDescription(e.target.value)}/></div>
          <button onClick={() => setIsFavorite(!isFavorite)} className="flex items-center gap-2 text-sm text-muted-foreground tap-scale"><span className={cn("h-4 w-4 rounded border-2 grid place-items-center", isFavorite ? "bg-amber-400 border-amber-400" : "border-muted-foreground/40")}>{isFavorite && <Star className="h-3 w-3 fill-white text-white"/>}</span>{t("favorites")}</button>
        </div>
        <DialogFooter>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving || !name.trim() || !price}>{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : null}{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
