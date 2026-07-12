"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang, Theme } from "@/lib/types";

export type ScreenName =
  | "home" | "customers" | "customer" | "products" | "order"
  | "visit" | "visitResult" | "map" | "dashboard" | "reports"
  | "settings" | "endOfDay" | "search" | "newCustomer" | "route"
  | "delivery" | "manager" | "productManage" | "register";

export interface CartLine {
  productId: string;
  qty: number; // cartons
  unitPrice: number;
}

export interface NavParams {
  customerId?: string;
  fromScreen?: ScreenName;
  returnTo?: ScreenName;
  [k: string]: unknown;
}

export interface RouteState {
  customerIds: string[];
  index: number;
  startedAt: string | null;
  skipped: string[];
}

interface AppState {
  // auth
  unlocked: boolean;
  rememberMe: boolean;
  setUnlocked: (v: boolean) => void;
  setRememberMe: (v: boolean) => void;
  lock: () => void;

  // ui prefs
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;

  // navigation
  screen: ScreenName;
  params: NavParams;
  history: { screen: ScreenName; params: NavParams }[];
  go: (screen: ScreenName, params?: NavParams) => void;
  back: () => void;
  canGoBack: () => boolean;

  // daily route
  route: RouteState;
  startRoute: (ids: string[]) => void;
  nextInRoute: () => void;
  skipInRoute: () => void;
  stopRoute: () => void;
  currentRouteCustomerId: () => string | null;

  // order cart
  cart: CartLine[];
  cartCustomerId: string | null;
  setCartCustomerId: (id: string | null) => void;
  setCart: (lines: CartLine[]) => void;
  addCartLine: (line: CartLine) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeCartLine: (productId: string) => void;
  clearCart: () => void;

  // online status
  online: boolean;
  setOnline: (v: boolean) => void;

  // floating button
  fabOpen: boolean;
  setFabOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      unlocked: false,
      rememberMe: true,
      setUnlocked: (v) => set({ unlocked: v }),
      setRememberMe: (v) => set({ rememberMe: v }),
      lock: () => set({ unlocked: false }),

      lang: "fr",
      theme: "system",
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),

      screen: "home",
      params: {},
      history: [],
      go: (screen, params = {}) =>
        set((s) => ({
          screen,
          params,
          history: [...s.history, { screen: s.screen, params: s.params }].slice(-30),
        })),
      back: () =>
        set((s) => {
          if (s.history.length === 0) return { screen: "home", params: {} };
          const prev = s.history[s.history.length - 1];
          return {
            screen: prev.screen,
            params: prev.params,
            history: s.history.slice(0, -1),
          };
        }),
      canGoBack: () => get().history.length > 0,

      route: { customerIds: [], index: 0, startedAt: null, skipped: [] },
      startRoute: (ids) =>
        set({ route: { customerIds: ids, index: 0, startedAt: new Date().toISOString(), skipped: [] } }),
      nextInRoute: () =>
        set((s) => {
          const next = s.route.index + 1;
          if (next >= s.route.customerIds.length) return { route: { ...s.route, index: s.route.customerIds.length } };
          return { route: { ...s.route, index: next } };
        }),
      skipInRoute: () =>
        set((s) => {
          const cur = s.route.customerIds[s.route.index];
          const skipped = cur ? [...s.route.skipped, cur] : s.route.skipped;
          const next = s.route.index + 1;
          return { route: { ...s.route, index: next, skipped } };
        }),
      stopRoute: () => set({ route: { customerIds: [], index: 0, startedAt: null, skipped: [] } }),
      currentRouteCustomerId: () => {
        const r = get().route;
        return r.customerIds[r.index] ?? null;
      },

      cart: [],
      cartCustomerId: null,
      setCartCustomerId: (id) => set({ cartCustomerId: id }),
      setCart: (lines) => set({ cart: lines }),
      addCartLine: (line) =>
        set((s) => {
          const existing = s.cart.find((c) => c.productId === line.productId);
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.productId === line.productId ? { ...c, qty: c.qty + line.qty } : c
              ),
            };
          }
          return { cart: [...s.cart, line] };
        }),
      updateCartQty: (productId, qty) =>
        set((s) => ({
          cart: qty <= 0
            ? s.cart.filter((c) => c.productId !== productId)
            : s.cart.map((c) => (c.productId === productId ? { ...c, qty } : c)),
        })),
      removeCartLine: (productId) =>
        set((s) => ({ cart: s.cart.filter((c) => c.productId !== productId) })),
      clearCart: () => set({ cart: [], cartCustomerId: null }),

      online: true,
      setOnline: (v) => set({ online: v }),

      fabOpen: false,
      setFabOpen: (v) => set({ fabOpen: v }),
    }),
    {
      name: "fsr-app-v1",
      partialize: (s) => ({
        unlocked: s.unlocked,
        rememberMe: s.rememberMe,
        lang: s.lang,
        theme: s.theme,
        screen: s.screen,
        params: s.params,
        history: s.history,
        route: s.route,
        cart: s.cart,
        cartCustomerId: s.cartCustomerId,
      }),
    }
  )
);
