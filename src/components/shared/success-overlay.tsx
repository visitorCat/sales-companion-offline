"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

/**
 * SuccessOverlay — a full-screen animated success check that appears briefly.
 * Shows for 1.2s then calls onDone.
 */
export function SuccessOverlay({
  show, message, onDone,
}: {
  show: boolean;
  message?: string;
  onDone?: () => void;
}) {
  // Timer to auto-dismiss — calls onDone callback (no internal state needed)
  useEffect(() => {
    if (!show || !onDone) return;
    const id = setTimeout(onDone, 1200);
    return () => clearTimeout(id);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] grid place-items-center bg-background/80 backdrop-blur-sm pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500/30"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.4, 1] }}
                transition={{ duration: 0.6 }}
              />
              <div className="relative h-24 w-24 rounded-full bg-emerald-500 grid place-items-center shadow-xl shadow-emerald-500/40">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Check className="h-12 w-12 text-white" strokeWidth={3} />
                </motion.div>
              </div>
            </div>
            {message && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-base font-semibold text-foreground"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
