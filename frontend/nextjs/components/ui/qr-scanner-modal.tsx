"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  QrCode, Camera, Loader2, CheckCircle2, X,
} from "lucide-react";
import { colisApi } from "@/lib/api-client";
import { useAppToast } from "@/context/toast-context";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess?: (colis: any) => void;
  totalColis?: number;
}

export function QRScannerModal({ open, onOpenChange, onScanSuccess, totalColis }: QRScannerModalProps) {
  const { addToast } = useAppToast();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const scannedRef = useRef<Set<number>>(new Set());
  const qrRef = useRef<Html5Qrcode | null>(null);
  const readerId = "qr-reader-element";
  const mountedRef = useRef(true);
  const cameraStoppedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopCamera = useCallback(async () => {
    cameraStoppedRef.current = true;
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      try { qrRef.current.clear(); } catch {}
      qrRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    cameraStoppedRef.current = false;
    setError("");
    setScanSuccess(false);
    try {
      await stopCamera();
      cameraStoppedRef.current = false;
      const qr = new Html5Qrcode(readerId);
      qrRef.current = qr;
      if (!mountedRef.current) return;
      setScanning(true);
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          cameraStoppedRef.current = true;
          await stopCamera();
          if (mountedRef.current) setScanning(false);
          const uuid = decodedText.trim();
          setProcessing(true);
          setError("");
          try {
            const listRes = await colisApi.list();
            if (!listRes.success || !mountedRef.current) {
              setError("Erreur lors de la recherche du colis");
              setProcessing(false);
              return;
            }
            const found = (listRes.data || []).find((c: any) => c.uuid === uuid);
            if (!found) {
              setError("Aucun colis trouvé avec cet identifiant");
              setProcessing(false);
              return;
            }
            if (scannedRef.current.has(found.id)) {
              setError("Colis déjà scanné — scannez un autre colis");
              setProcessing(false);
              return;
            }
            const collectRes = await colisApi.collect(found.id);
            if (collectRes.success && mountedRef.current) {
              scannedRef.current.add(found.id);
              const newCount = scannedRef.current.size;
              setScannedCount(newCount);
              setScanSuccess(true);
              if (onScanSuccess) onScanSuccess(collectRes.data);
              addToast({
                title: "Colis collecté",
                description: `${newCount}/${totalColis || "?"} scanné${newCount > 1 ? "s" : ""}`,
                variant: "success",
              });
              if (totalColis && newCount >= totalColis) {
                setTimeout(() => {
                  if (mountedRef.current) onOpenChange(false);
                }, 1500);
              } else {
                setTimeout(() => {
                  if (mountedRef.current) startCamera();
                }, 1000);
              }
            } else if (mountedRef.current) {
              setError(collectRes.error || "Impossible de collecter le colis");
            }
          } catch {
            if (mountedRef.current) setError("Erreur lors de la collecte");
          } finally {
            if (mountedRef.current) setProcessing(false);
          }
        },
        () => {},
      );
    } catch (err: any) {
      if (mountedRef.current && !cameraStoppedRef.current) {
        setError("Impossible d'accéder à la caméra");
        setScanning(false);
      }
    }
  }, [stopCamera, onScanSuccess, totalColis, onOpenChange, addToast]);

  useEffect(() => {
    if (open) {
      setError("");
      setScanSuccess(false);
      setScanning(false);
      setScannedCount(0);
      scannedRef.current = new Set();
      const t = setTimeout(() => startCamera(), 400);
      return () => clearTimeout(t);
    } else {
      stopCamera();
    }
  }, [open, startCamera, stopCamera]);

  const remaining = totalColis ? totalColis - scannedCount : 0;
  const showRetry = !scanning && !processing && !scanSuccess;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopCamera(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scanner un colis
            {totalColis ? (
              <span className="ml-auto text-xs font-normal text-gray-500">
                {scannedCount}/{totalColis}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <style>{`
          @keyframes qr-scan-line {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(calc(100% - 2px)); }
          }
          .scan-line {
            animation: qr-scan-line 2.5s ease-in-out infinite;
          }
        `}</style>

        <div className="space-y-3">
          <div className="relative mx-auto w-full max-w-sm aspect-square overflow-hidden rounded-lg bg-black">
            <div id={readerId} className="h-full w-full" />
            {scanning && (
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className="absolute inset-[12%] rounded-xl border-2 border-white/50">
                  <div className="scan-line absolute left-0 right-0 top-0 h-0.5 bg-forest-8000 shadow-[0_0_10px_rgba(217,119,63,0.7)]" />
                  <div className="absolute -top-1.5 -left-1.5 h-5 w-5 border-l-2 border-t-2 border-white rounded-tl-md" />
                  <div className="absolute -top-1.5 -right-1.5 h-5 w-5 border-r-2 border-t-2 border-white rounded-tr-md" />
                  <div className="absolute -bottom-1.5 -left-1.5 h-5 w-5 border-l-2 border-b-2 border-white rounded-bl-md" />
                  <div className="absolute -bottom-1.5 -right-1.5 h-5 w-5 border-r-2 border-b-2 border-white rounded-br-md" />
                </div>
              </div>
            )}
            {processing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            {scanSuccess && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-forest-8000/20">
                <CheckCircle2 className="h-14 w-14 text-forest-300" />
              </div>
            )}
          </div>
          {scanning && (
            <p className="text-center text-xs text-muted-foreground">
              Placez le QR code du colis dans le cadre
            </p>
          )}
          {scanSuccess && remaining > 0 && !processing && (
            <p className="text-center text-xs text-forest-300 font-medium">
              Colis réceptionné — {remaining} restant{remaining > 1 ? "s" : ""}
            </p>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {showRetry && (
            <Button onClick={() => startCamera()} className="w-full">
              <Camera className="h-4 w-4 mr-2" /> {error ? "Réessayer" : "Scanner un colis"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

