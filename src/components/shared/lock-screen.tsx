"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserPlus, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function LockScreen() {
  const t = useT();
  const setUnlocked = useAppStore(s=>s.setUnlocked);
  const go = useAppStore(s=>s.go);
  const setRep = useDataStore(s=>s.setRep);
  const [email,setEmail] = useState(""); const [password,setPassword] = useState(""); const [showPw,setShowPw] = useState(false); const [loading,setLoading] = useState(false); const [error,setError] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if(!email.trim()||!password) return;
    setLoading(true); setError(false);
    try {
      const { loginWithEmailPassword } = await import("@/lib/dexie-data");
      const r = await loginWithEmailPassword(email,password);
      if(r){ setRep(r); setUnlocked(true); toast.success(`${t("login")} — ${r.name}`); }
      else { setError(true); toast.error(t("wrongPin")); }
    } catch { setError(true); toast.error(t("error")); }
    setLoading(false);
  }

  return (
    <div className="min-h-dynamic flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-3xl bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30"><ShieldCheck className="h-10 w-10"/></div>
          <div className="text-center"><h1 className="text-2xl font-bold tracking-tight">{t("appName")}</h1><p className="text-sm text-muted-foreground">{t("tagline")}</p></div>
        </div>
        <form onSubmit={submit} className="w-full space-y-4">
          <div><Label>{t("emailAddress")} *</Label><div className="relative mt-1"><Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="email" className="h-12 ps-10" value={email} onChange={e=>{setEmail(e.target.value);setError(false);}} placeholder="email@example.com" inputMode="email" autoComplete="email" autoFocus/></div></div>
          <div><Label>{t("password")} *</Label><div className="relative mt-1"><Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type={showPw?"text":"password"} className="h-12 ps-10 pe-10" value={password} onChange={e=>{setPassword(e.target.value);setError(false);}} placeholder="••••" autoComplete="current-password"/><button type="button" onClick={()=>setShowPw(!showPw)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div>
          {error && <p className="text-xs text-destructive text-center">{t("wrongPin")}</p>}
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold tap-scale" disabled={loading||!email.trim()||!password}>{loading?<Loader2 className="h-5 w-5 animate-spin"/>:<ShieldCheck className="h-5 w-5 me-2"/>}{t("login")}</Button>
        </form>
        <button onClick={()=>go("register",{})} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline tap-scale"><UserPlus className="h-4 w-4"/>{t("register")}</button>
        <p className="text-xs text-muted-foreground/70 text-center">{t("loginHint")} — rep@field.app / 1234</p>
      </div>
    </div>
  );
}
