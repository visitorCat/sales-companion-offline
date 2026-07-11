"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScreenHeader } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import type { CustomerType, CustomerRating } from "@/lib/types";

const LocationPickerMap = dynamic(() => import("./location-picker-map").then((m) => m.LocationPickerMap), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-muted/40 grid place-items-center text-xs text-muted-foreground">…</div>,
});

const schema = z.object({
  shopName: z.string().min(1),
  owner: z.string().min(1),
  phone: z.string().optional().default(""),
  type: z.string().default("GROCERY"),
  sectorId: z.string().min(1),
  areaId: z.string().min(1),
  rating: z.enum(["A", "B", "C"]).default("C"),
  address: z.string().optional(),
});

type FormVals = z.infer<typeof schema>;

const TYPES: { v: CustomerType; key: string }[] = [
  { v: "GROCERY", key: "GROCERY" },
  { v: "MINI_MARKET", key: "MINI_MARKET" },
  { v: "SUPERMARKET", key: "SUPERMARKET" },
  { v: "WHOLESALE", key: "WHOLESALE" },
  { v: "RESTAURANT", key: "RESTAURANT" },
  { v: "FAST_FOOD", key: "FAST_FOOD" },
  { v: "PIZZERIA", key: "PIZZERIA" },
  { v: "BAKERY", key: "BAKERY" },
  { v: "PASTRY_SHOP", key: "PASTRY_SHOP" },
  { v: "HOTEL", key: "HOTEL" },
  { v: "CAFE", key: "CAFE" },
  { v: "OTHER", key: "OTHER" },
];

export function NewCustomerScreen() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const back = useAppStore((s) => s.back);
  const { sectors, areas, upsertCustomer, customers, rep } = useDataStore();
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { type: "GROCERY", rating: "C", sectorId: sectors[0]?.id ?? "", areaId: "" },
  });

  const sectorId = form.watch("sectorId");
  const areasForSector = areas.filter((a) => a.sectorId === sectorId);

  function useLocation() {
    if (!navigator.geolocation) {
      toast.error(t("error"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success(`${t("latitude")}: ${pos.coords.latitude.toFixed(4)}, ${t("longitude")}: ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error(t("error"));
        } else {
          toast.error(t("error"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function onSubmit(vals: FormVals) {
    setSaving(true);
    const tempId = `local-${Date.now()}`;
    const phone = vals.phone ?? "";
    const customer = {
      id: tempId,
      shopName: vals.shopName,
      owner: vals.owner,
      phone,
      type: vals.type as CustomerType,
      sectorId: vals.sectorId,
      areaId: vals.areaId,
      rating: vals.rating as CustomerRating,
      lat, lng,
      address: vals.address ?? null,
      lastVisitAt: null,
      lastOrderAt: null,
      visitOrder: customers.length,
      active: true,
    };
    upsertCustomer(customer);
    toast.success(t("customerSaved"));
    try {
      const { createCustomer } = await import("@/lib/dexie-data");
      const created = await createCustomer({ shopName: vals.shopName, owner: vals.owner, phone, type: vals.type, sectorId: vals.sectorId, areaId: vals.areaId, repId: rep?.id ?? null, rating: vals.rating, lat, lng, address: vals.address ?? null, visitOrder: customers.length });
      useDataStore.getState().removeCustomer(tempId);
      upsertCustomer({ ...customer, id: created.id });
      go("customer", { customerId: created.id, returnTo: "home" }); return;
    } catch { /* keep local */ }
    back();
    setSaving(false);
  }

  return (
    <div className="min-h-dynamic">
      <ScreenHeader title={t("newCustomer")} />
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 pt-3 pb-32 space-y-4">
        <Card className="p-4 space-y-3">
          <div>
            <Label>{t("shopName")} *</Label>
            <Input className="mt-1 h-11" {...form.register("shopName")} placeholder={t("shopName")} />
            {form.formState.errors.shopName && <p className="text-xs text-destructive mt-1">{t("error")}</p>}
          </div>
          <div>
            <Label>{t("owner")} *</Label>
            <Input className="mt-1 h-11" {...form.register("owner")} placeholder={t("owner")} />
          </div>
          <div>
            <Label>{t("phone")}</Label>
            <Input className="mt-1 h-11" {...form.register("phone")} placeholder="06 00 00 00 00" inputMode="tel" />
          </div>
          <div>
            <Label>{t("customerType")}</Label>
            <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v)}>
              <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((tp) => <SelectItem key={tp.v} value={tp.v}>{t(tp.key) === tp.key ? tp.v.replace("_", " ") : t(tp.key)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <Label>{t("sector")} *</Label>
            <Select value={sectorId} onValueChange={(v) => { form.setValue("sectorId", v); form.setValue("areaId", ""); }}>
              <SelectTrigger className="mt-1 h-11"><SelectValue placeholder={t("selectSector")} /></SelectTrigger>
              <SelectContent>
                {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("area")} *</Label>
            <Select value={form.watch("areaId")} onValueChange={(v) => form.setValue("areaId", v)}>
              <SelectTrigger className="mt-1 h-11"><SelectValue placeholder={t("selectArea")} /></SelectTrigger>
              <SelectContent>
                {areasForSector.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("rating")}</Label>
            <div className="flex gap-2 mt-1">
              {(["A", "B", "C"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => form.setValue("rating", r)}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold border transition-colors tap-scale ${
                    form.watch("rating") === r ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  }`}
                >
                  {t(`rating${r}` as any)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("address")}</Label>
            <Input className="mt-1 h-11" {...form.register("address")} placeholder={t("address")} />
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <Label>{t("pickOnMap")}</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="flex-1 h-11 tap-scale" onClick={useLocation} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <LocateFixed className="h-4 w-4 me-2" />}
              {t("useMyLocation")}
            </Button>
          </div>
          <div className="h-48 rounded-xl overflow-hidden border border-border relative">
            <LocationPickerMap lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
          </div>
          {lat !== null && lng !== null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          )}
        </Card>

        <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur border-t pb-safe">
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold tap-scale" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t("saveCustomer")}
          </Button>
        </div>
      </form>
    </div>
  );
}
