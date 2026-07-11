"use client";

import { useState, useEffect, useRef } from "react";
import { useT } from "@/hooks/use-t";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Search } from "lucide-react";

/**
 * BarcodeScannerDialog — a camera-free barcode/SKU entry dialog.
 * Since camera barcode scanning requires native permissions and a library,
 * this provides a fast manual-entry alternative: rep types or scans via
 * a hardware bluetooth scanner into the input, and we match against product SKUs/barcodes.
 */
export function BarcodeScannerDialog({
  open, onOpenChange, onMatch,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMatch: (productId: string) => void;
}) {
  const t = useT();
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // focus input on open + reset on close (via key change)
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, [open]);

  function handleClose(v: boolean) {
    if (!v) setCode("");
    onOpenChange(v);
  }

  function handleSubmit() {
    if (!code.trim()) return;
    onMatch(code.trim());
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {t("scanProduct")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <ScanLine className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder={t("barcodePlaceholder")}
              className="h-14 ps-11 text-lg font-mono rounded-2xl border-2 border-primary/30 focus:border-primary"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("barcodeHint")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
            {t("cancel")}
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!code.trim()}>
            <Search className="h-4 w-4 me-1" /> {t("search")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
