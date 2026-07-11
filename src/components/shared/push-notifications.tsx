"use client";

import { useEffect } from "react";
import { useScheduledVisits } from "@/store/scheduled-visits";
import { useAppStore } from "@/store/app-store";

const NOTIFICATION_PERMISSION_KEY = "fsr-notif-permission-requested";

/**
 * PushNotificationManager — checks for scheduled visits due today
 * and triggers browser notifications (with permission).
 * Runs on app mount + when online.
 */
export function PushNotificationManager() {
  const unlocked = useAppStore((s) => s.unlocked);

  useEffect(() => {
    if (!unlocked) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Request permission once (on first unlock)
    const requested = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    if (!requested && Notification.permission === "default") {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "1");
      // Don't auto-request — would be intrusive. Show a hint instead.
    }

    // Check for due visits every 5 minutes
    const checkAndNotify = () => {
      if (Notification.permission !== "granted") return;
      const today = new Date().toISOString().slice(0, 10);
      const visits = useScheduledVisits.getState().visits;
      const todayVisits = visits.filter((v) => v.date === today && !v.done);
      const notifiedKey = `fsr-notified-${today}`;
      const notified = JSON.parse(localStorage.getItem(notifiedKey) || "[]");

      for (const v of todayVisits) {
        if (!notified.includes(v.id)) {
          try {
            new Notification("Sales Companion — Visit Reminder", {
              body: `${v.shopName}${v.time ? ` at ${v.time}` : ""}`,
              icon: "/icons/icon-192.png",
              tag: v.id,
            });
            notified.push(v.id);
            localStorage.setItem(notifiedKey, JSON.stringify(notified));
          } catch {
            // notification failed — skip
          }
        }
      }
    };

    // Check on mount + interval
    checkAndNotify();
    const id = setInterval(checkAndNotify, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [unlocked]);

  return null;
}

/**
 * Request notification permission (called from settings).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Send a test notification.
 */
export function sendTestNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    // ignore
  }
}
