"use client";

import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { LockScreen } from "@/components/shared/lock-screen";
import { BottomNav } from "@/components/shared/bottom-nav";
import { FloatingButton } from "@/components/shared/floating-button";
import { HomeScreen } from "@/components/screens/home-screen";
import { CustomersScreen } from "@/components/screens/customers-screen";
import { CustomerScreen } from "@/components/screens/customer-screen";
import { NewCustomerScreen } from "@/components/screens/new-customer-screen";
import { ProductsScreen } from "@/components/screens/products-screen";
import { OrderScreen } from "@/components/screens/order-screen";
import { VisitScreen } from "@/components/screens/visit-screen";
import { MapScreen } from "@/components/screens/map-screen";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { ReportsScreen } from "@/components/screens/reports-screen";
import { SettingsScreen } from "@/components/screens/settings-screen";
import { EndOfDayScreen } from "@/components/screens/end-of-day-screen";
import { SearchScreen } from "@/components/screens/search-screen";
import { RouteScreen } from "@/components/screens/route-screen";
import { DeliveryScreen } from "@/components/screens/delivery-screen";
import { ManagerScreen } from "@/components/screens/manager-screen";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const unlocked = useAppStore((s) => s.unlocked);
  const screen = useAppStore((s) => s.screen);
  const hydrated = useDataStore((s) => s.hydrated);
  const customers = useDataStore((s) => s.customers);

  if (!unlocked) return <LockScreen />;

  // Show a branded skeleton on very first load when no local data yet
  if (!hydrated && customers.length === 0) {
    return <LoadingSkeleton />;
  }

  const render = () => {
    switch (screen) {
      case "home": return <HomeScreen />;
      case "customers": return <CustomersScreen />;
      case "customer": return <CustomerScreen />;
      case "newCustomer": return <NewCustomerScreen />;
      case "products": return <ProductsScreen />;
      case "order": return <OrderScreen />;
      case "visit": return <VisitScreen />;
      case "visitResult": return <VisitScreen />;
      case "map": return <MapScreen />;
      case "dashboard": return <DashboardScreen />;
      case "reports": return <ReportsScreen />;
      case "settings": return <SettingsScreen />;
      case "endOfDay": return <EndOfDayScreen />;
      case "search": return <SearchScreen />;
      case "route": return <RouteScreen />;
      case "delivery": return <DeliveryScreen />;
      case "manager": return <ManagerScreen />;
      default: return <HomeScreen />;
    }
  };

  // Screens that are full overlays (no bottom nav)
  const overlayScreens = ["order", "visit", "visitResult", "search", "newCustomer", "endOfDay", "route", "map"];
  const isOverlay = overlayScreens.includes(screen);

  return (
    <div className="min-h-dynamic flex flex-col">
      <main className={cn("flex-1", isOverlay ? "" : "pb-28")}>{render()}</main>
      {!isOverlay && <FloatingButton />}
      {!isOverlay && <BottomNav />}
    </div>
  );
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

function LoadingSkeleton() {
  return (
    <div className="min-h-dynamic p-4 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pt-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1 text-end">
            <Skeleton className="h-2 w-12 rounded-full ms-auto" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Objective card skeleton (gradient placeholder) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-teal-700 p-4 h-44">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative space-y-3">
          <Skeleton className="h-4 w-32 rounded-full bg-white/20" />
          <Skeleton className="h-8 w-40 rounded-full bg-white/20" />
          <Skeleton className="h-2.5 w-full rounded-full bg-white/20" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl bg-white/15" />
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      {/* Section skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground/60 pt-4">
        Loading your daily work…
      </p>
    </div>
  );
}
