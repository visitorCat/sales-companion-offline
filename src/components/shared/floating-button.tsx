"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { cn } from "@/lib/utils";
import { Plus, Search, UserPlus, ClipboardList, MapPin, Flag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingButton() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const open = useAppStore((s) => s.fabOpen);
  const setOpen = useAppStore((s) => s.setFabOpen);
  const customers = useDataStore((s) => s.customers);
  const [routeIds] = useState<string[]>([]);

  const actions = [
    {
      key: "newVisit",
      icon: ClipboardList,
      color: "bg-amber-500",
      onClick: () => {
        if (customers.length) {
          go("customer", { customerId: customers[0].id, returnTo: "home" });
        }
        setOpen(false);
      },
    },
    {
      key: "newOrder",
      icon: Plus,
      color: "bg-primary",
      onClick: () => {
        if (customers.length) {
          go("order", { customerId: customers[0].id, returnTo: "home" });
        }
        setOpen(false);
      },
    },
    {
      key: "search",
      icon: Search,
      color: "bg-sky-600",
      onClick: () => {
        go("search", { returnTo: "home" });
        setOpen(false);
      },
    },
    {
      key: "newCustomer",
      icon: UserPlus,
      color: "bg-emerald-600",
      onClick: () => {
        go("newCustomer", { returnTo: "home" });
        setOpen(false);
      },
    },
    {
      key: "finishDay",
      icon: Flag,
      color: "bg-rose-600",
      onClick: () => {
        go("endOfDay", { returnTo: "home" });
        setOpen(false);
      },
    },
  ];

  return (
    <div className="fixed bottom-20 inset-x-0 z-40 pointer-events-none flex justify-center px-4">
      <div className="relative pointer-events-auto">
        <AnimatePresence>
          {open && (
            <div className="absolute bottom-16 inset-x-0 flex flex-col items-center gap-2">
              {actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <motion.button
                    key={a.key}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={a.onClick}
                    className="flex items-center gap-3 bg-card border shadow-lg rounded-full pl-2 pr-4 h-11 tap-scale"
                  >
                    <span className={cn("h-7 w-7 rounded-full grid place-items-center text-white", a.color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium whitespace-nowrap">{t(a.key)}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "h-14 w-14 rounded-full grid place-items-center text-primary-foreground shadow-xl shadow-primary/40 tap-scale transition-transform",
            open ? "bg-destructive rotate-45" : "bg-primary"
          )}
          aria-label="quick actions"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
