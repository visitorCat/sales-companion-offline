"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { seedDatabase } from "@/lib/seed-dexie";
import { loadAllData } from "@/lib/dexie-data";
import { useScheduledVisits } from "@/store/scheduled-visits";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } } });

function ThemeSync() { const theme = useAppStore(s=>s.theme); useEffect(() => { const r=document.documentElement; const a=(t:string)=>{const d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.classList.toggle("dark",d);}; a(theme); if(theme==="system"){const m=window.matchMedia("(prefers-color-scheme: dark)");const h=()=>a("system");m.addEventListener("change",h);return()=>m.removeEventListener("change",h);} }, [theme]); return null; }
function DirSync() { const lang = useAppStore(s=>s.lang); useEffect(() => { document.documentElement.lang=lang; document.documentElement.dir=lang==="ar"?"rtl":"ltr"; }, [lang]); return null; }
function OnlineSync() { const setOnline = useAppStore(s=>s.setOnline); useEffect(() => { setOnline(navigator.onLine); const on=()=>setOnline(true),off=()=>setOnline(false); window.addEventListener("online",on); window.addEventListener("offline",off); return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);}; }, [setOnline]); return null; }
function SWReg() { useEffect(() => { if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{}); }, []); return null; }

function DexieDataLoader() {
  const hydrate = useDataStore(s=>s.hydrate); const repId = useDataStore(s=>s.rep?.id); const setRep = useDataStore(s=>s.setRep); const hSV = useScheduledVisits(s=>s.hydrate);
  useEffect(() => { let c=false; async function load(){ try{ await seedDatabase(); const d=await loadAllData(repId); if(!c){ hydrate(d); if(!useDataStore.getState().rep&&d.rep) setRep(d.rep); if(d.scheduledVisits) hSV(d.scheduledVisits.map(sv=>({id:sv.id,customerId:sv.customerId,customerName:"",shopName:"",date:sv.date,time:sv.time??undefined,note:sv.note??undefined,done:sv.done,createdAt:sv.createdAt}))); } }catch(e){console.error(e);} } load(); const f=()=>load(); window.addEventListener("focus",f); return()=>{c=true;window.removeEventListener("focus",f);}; }, [hydrate,hSV,repId,setRep]); return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (<QueryClientProvider client={queryClient}><ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange><DirSync/><ThemeSync/><OnlineSync/><SWReg/><DexieDataLoader/>{children}</ThemeProvider></QueryClientProvider>);
}
