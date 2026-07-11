"use client";

import { useAppStore } from "@/store/app-store";
import { translate } from "@/lib/i18n";

export function useT() {
  const lang = useAppStore((s) => s.lang);
  return (key: string) => translate(lang, key);
}
