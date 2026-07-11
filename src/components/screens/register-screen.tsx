"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, ChevronLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export function RegisterScreen() {
  const t = useT();
  const setUnlocked = useAppStore(s=>s.setUnlocked);
  const setRep = useDataStore(s=>s.setRep);
  const back = useAppStore(s=>s.back);
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [phone,setPhone]=useState(""); const [password,setPassword]=useState(""); const [showPw,setShowPw]=useState(false); const [target,setTarget]=useState("100"); const [loading,setLoading]=useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if(!name.trim()||!email.trim()||!phone.trim()||password.length<4){toast.error(t("error"));return;}
    setLoading(true);
    try { const { registerRep } = await import("@/lib/dexie-data"); const r = await registerRep({name:name.trim(),email:email.trim(),password,phone:phone.trim(),monthlyTargetCartons:parseInt(target)||100}); setRep(r); setUnlocked(true); toast.success(t("accountCreated")); }
    catch(e:any){ if(e?.message?.includes("already")) toast.error(t("emailExists")); else toast.error(t("error")); }
    setLoading(false);
  }

  return (
    <div className="min-h-dynamic flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary/10 via-background to-background">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">
        <button onClick={back} className="self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground tap-scale"><ChevronLeft className="h-4 w-4 rtl:rotate-180"/>{t("back")}</button>
        <div className="flex flex-col items-center gap-3"><div className="h-16 w-16 rounded-3xl bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30"><UserPlus className="h-8 w-8"/></div><div className="text-center"><h1 className="text-xl font-bold tracking-tight">{t("registerTitle")}</h1><p className="text-sm text-muted-foreground">{t("tagline")}</p></div></div>
        <form onSubmit={submit} className="w-full space-y-3">
          <div><Label>{t("fullName")} *</Label><Input className="mt-1 h-12" value={name} onChange={e=>setName(e.target.value)} placeholder={t("fullName")}/></div>
          <div><Label>{t("emailAddress")} *</Label><div className="relative mt-1"><Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input className="h-12 ps-10" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com"/></div></div>
          <div><Label>{t("phoneNumber")} *</Label><Input className="mt-1 h-12" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="06 00 00 00 00" inputMode="tel"/></div>
          <div className="grid grid-cols-2 gap-2"><div><Label>{t("password")} *</Label><div className="relative mt-1"><Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input className="h-12 ps-10 pe-10" type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••"/><button type="button" onClick={()=>setShowPw(!showPw)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPw?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div><div><Label>{t("monthlyTarget")}</Label><Input className="mt-1 h-12" type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="100"/></div></div>
        </form>
        <Button className="w-full h-14 rounded-2xl text-base font-semibold tap-scale" onClick={submit} disabled={loading||!name.trim()||!email.trim()||password.length<4}>{loading?<Loader2 className="h-5 w-5 animate-spin"/>:<UserPlus className="h-5 w-5 me-2"/>}{t("createAccount")}</Button>
        <p className="text-xs text-center text-muted-foreground">{t("haveAccount")} <button onClick={back} className="text-primary font-medium hover:underline">{t("login2")}</button></p>
      </div>
    </div>
  );
}
