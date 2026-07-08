"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, ChevronRight, Truck, User, Phone, CheckCircle2, QrCode, Camera, Loader2, X, Package } from "lucide-react";
import { useAppToast } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import { ordersApi, colisApi, Colis, usersApi } from "@/lib/api-client";
import { deliveriesApi } from "@/lib/deliveries-api";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Order,
  OrderItem,
  OrderSkeleton,
  OrderHeaderFull,
  ProductsTable,
  PaymentSummary,
  CustomerInfo,
  parseOptionalNumber,
} from "@/components/orders/order-detail-shared";
import { ColisCardRow, ColisAvatar } from "@/components/colis/colis-card-row";

function parseIsoToDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ExpeditionSection({ items }: { items: OrderItem[] }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm h-full">
      <h3 className="mb-3 text-lg font-semibold text-gray-900">Dépôt / expédition (lignes artisans)</h3>
      <ul className="space-y-3 text-sm">
        {items
          .filter((it) => {
            const item = it as unknown as Record<string, unknown>;
            const at =
              (item.expeditionSubmittedAt as string | undefined) ||
              (item.expedition_submitted_at as string | undefined);
            return Boolean(at);
          })
          .map((it, idx: number) => {
            const item = it as unknown as Record<string, unknown>;
            const name = (item.name as string) || ((item.product as Record<string, unknown> | undefined)?.name as string) || "Produit";
            const coop =
              (item.expeditionCooperative as string) ||
              (item.expedition_cooperative as string) ||
              "";
            const colis =
              (item.expeditionNumeroColis as string) ||
              (item.expedition_numero_colis as string) ||
              "";
            const mode = (item.expeditionMode as string) || (item.expedition_mode as string) || "";
            const at =
              (item.expeditionSubmittedAt as string) ||
              (item.expedition_submitted_at as string) ||
              "";
            const submitted = at ? new Date(at).toLocaleString("fr-FR") : "—";
            const modeLabel = mode === "deposit" ? "Dépôt" : mode === "ship" ? "Envoi colis" : mode || "—";
            return (
              <li key={idx} className="rounded-md border border-gray-100 bg-gray-50/80 p-3">
                <p className="font-medium text-gray-900">{name}</p>
                <p className="text-gray-600">
                  Artisan : {(item.artisan as string) || "—"} &middot; Mode : {modeLabel}
                </p>
                {(coop || colis) && (
                  <p className="text-gray-600">
                    {coop ? `Coopérative : ${coop}` : null}
                    {coop && colis ? " · " : ""}
                    {colis ? `N° colis : ${colis}` : null}
                  </p>
                )}
                <p className="text-xs text-gray-500">Enregistré le {submitted}</p>
              </li>
            );
          })}
      </ul>
      {(items as unknown as Record<string, unknown>[]).every(
        (it) =>
          !(
            (it.expeditionSubmittedAt as string | undefined) ||
            (it.expedition_submitted_at as string | undefined)
          ),
      ) && (
        <p className="text-sm text-gray-500">Aucune information d&apos;expédition renseignée sur les lignes.</p>
      )}
    </div>
  );
}

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const { addToast } = useAppToast();
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanTargetUuid, setScanTargetUuid] = useState<string | null>(null);
  const [colisList, setColisList] = useState<Colis[]>([]);
  const [highlightedItemIds, setHighlightedItemIds] = useState<number[]>([]);
  const [selectedColisId, setSelectedColisId] = useState<number | null>(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignLivreurs, setReassignLivreurs] = useState<any[]>([]);
  const [selectedLivreurId, setSelectedLivreurId] = useState<string>("");
  const [reassignLoading, setReassignLoading] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const readerId = "admin-scan-reader";
  const mountedRef = useRef(true);
  const restartRef = useRef(false);
  const scanSucceededRef = useRef(false);
  const scanModalOpenRef = useRef(scanModalOpen);
  useEffect(() => { scanModalOpenRef.current = scanModalOpen; }, [scanModalOpen]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopCamera = useCallback(async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
    }
  }, []);

  const clearCamera = useCallback(async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      try { qrRef.current.clear(); } catch {}
      qrRef.current = null;
    }
  }, []);

  const loadColis = useCallback(async () => {
    try {
      const res = await colisApi.list({ validation: Number(orderId) });
      if (res.success) {
        setColisList(res.data || []);
      }
    } catch (e) {
      console.error("Error loading colis:", e);
    }
  }, [orderId]);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ordersApi.getOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data as Order);
        loadColis();
      } else {
        setOrder(null);
      }
    } catch (e) {
      console.error("Error loading order:", e);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, loadColis]);

  const refreshOrder = useCallback(async () => {
    try {
      const response = await ordersApi.getOrder(orderId);
      if (response.success && response.data) {
        setOrder(response.data as Order);
      }
    } catch (e) {
      console.error("Error refreshing order:", e);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId, loadOrder]);

  const handleRequestPayment = useCallback(async () => {
    const st = String(order?.status ?? "").toLowerCase().trim();
    if (st !== "confirmed") return;
    try {
      const resp = await ordersApi.adminRequestPayment(orderId);
      if (resp.success && resp.data) {
        setOrder(resp.data as Order);
        addToast({ variant: "success", title: "Paiement demandé", description: "Le client a été notifié." });
      } else {
        addToast({ variant: "error", title: "Erreur", description: resp.error || "Impossible de demander le paiement." });
      }
    } catch (err) {
      console.error("Request payment error:", err);
      addToast({ variant: "error", title: "Erreur", description: "Impossible de demander le paiement." });
    }
  }, [orderId, order?.status, addToast]);

  const handleValidateCOD = useCallback(async () => {
    const st = String(order?.status ?? "").toLowerCase().trim();
    if (st !== "confirmed") return;
    try {
      const resp = await ordersApi.adminValidateCOD(orderId);
      if (resp.success && resp.data) {
        setOrder(resp.data as Order);
        addToast({ variant: "success", title: "Commande validée", description: "La commande est en préparation." });
      } else {
        addToast({ variant: "error", title: "Erreur", description: resp.error || "Impossible de valider." });
      }
    } catch (err) {
      console.error("Validate COD error:", err);
      addToast({ variant: "error", title: "Erreur", description: "Impossible de valider." });
    }
  }, [orderId, order?.status, addToast]);

  const handleConfirmMobilePayment = useCallback(async () => {
    const st = String(order?.status ?? "").toLowerCase().trim();
    if (st !== "awaiting_payment") return;
    setConfirmLoading(true);
    try {
      const response = await ordersApi.adminConfirmPayment(orderId);
      if (response.success && response.data) {
        setOrder(response.data as Order);
        addToast({ variant: "success", title: "Paiement confirmé", description: "La commande est confirmée." });
      } else {
        addToast({ variant: "error", title: "Erreur", description: response.error || "Impossible de confirmer." });
      }
    } catch (err) {
      console.error("Confirm payment error:", err);
      addToast({ variant: "error", title: "Erreur", description: "Impossible de confirmer." });
    } finally {
      setConfirmLoading(false);
    }
  }, [orderId, order?.status, addToast]);

  const handleRejectPayment = useCallback(async () => {
    const st = String(order?.status ?? "").toLowerCase().trim();
    if (st !== "awaiting_payment") return;
    setRejectLoading(true);
    try {
      const response = await ordersApi.adminRejectPayment(orderId);
      if (response.success && response.data) {
        setOrder(response.data as Order);
        addToast({ variant: "success", title: "Référence refusée", description: "Le client a été notifié et peut ressaisir une référence." });
      } else {
        addToast({ variant: "error", title: "Erreur", description: response.error || "Impossible de refuser." });
      }
    } catch (err) {
      console.error("Reject payment error:", err);
      addToast({ variant: "error", title: "Erreur", description: "Impossible de refuser." });
    } finally {
      setRejectLoading(false);
    }
  }, [orderId, order?.status, addToast]);

  const handleColisSelect = useCallback((colis: Colis) => {
    if (selectedColisId === colis.id) {
      setSelectedColisId(null);
      setHighlightedItemIds([]);
    } else {
      setSelectedColisId(colis.id);
      setHighlightedItemIds(colis.item_ids || []);
    }
  }, [selectedColisId]);

  useEffect(() => {
    if (highlightedItemIds.length > 0 && productsRef.current) {
      productsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlightedItemIds]);

  const handleScan = useCallback(async (uuid: string) => {
    setScanError("");
    setScanProcessing(true);
    try {
      const listRes = await colisApi.list({ validation: Number(orderId) });
      if (!listRes.success || !mountedRef.current) {
        setScanError("Erreur lors de la recherche du colis");
        setScanProcessing(false);
        scanSucceededRef.current = false;
        restartRef.current = true;
        return;
      }
      if (scanTargetUuid && uuid !== scanTargetUuid) {
        setScanError("Ce QR code ne correspond pas au colis sélectionné");
        setScanProcessing(false);
        scanSucceededRef.current = false;
        restartRef.current = true;
        return;
      }
      const found = (listRes.data || []).find((c: any) => c.uuid === uuid);
      if (!found) {
        setScanError("Aucun colis trouvé avec cet identifiant");
        setScanProcessing(false);
        scanSucceededRef.current = false;
        restartRef.current = true;
        return;
      }
      const dispatchRes = await colisApi.dispatcher(found.id, { mode: found.mode || "depot" });
      if (dispatchRes.success && mountedRef.current) {
        const freshColisRes = await colisApi.list({ validation: Number(orderId) });
        const freshColis = freshColisRes.success ? (freshColisRes.data || []) : [];
        const allDone = freshColis.length > 0 && freshColis.every(
          (c: any) => c.statut !== "preparing"
        );
        await refreshOrder();
        loadColis();
        addToast({ variant: "success", title: "Colis déposé", description: "Colis enregistré comme déposé au hub." });
        setScanTargetUuid(null);
        scanSucceededRef.current = true;
        restartRef.current = !allDone;
        setScanProcessing(false);
        if (allDone) {
          setScanModalOpen(false);
        }
      } else if (mountedRef.current) {
        setScanError(dispatchRes.error || "Impossible de déposer le colis");
        setScanProcessing(false);
        scanSucceededRef.current = false;
        restartRef.current = true;
      }
    } catch {
      if (mountedRef.current) {
        setScanError("Erreur lors du dépôt");
        setScanProcessing(false);
        scanSucceededRef.current = false;
        restartRef.current = true;
      }
    }
  }, [orderId, loadOrder, addToast, loadColis, scanTargetUuid]);

  const handleOpenReassignModal = useCallback(async () => {
    setSelectedLivreurId("");
    setReassignLivreurs([]);
    setReassignModalOpen(true);
    const resp = await usersApi.fetchLivreurs();
    if (resp.success && resp.data) {
      setReassignLivreurs(resp.data);
    }
  }, []);

  const handleReassign = useCallback(async () => {
    if (!selectedLivreurId) return;
    const deliveryId = order?.delivery?.id;
    if (!deliveryId) return;
    setReassignLoading(true);
    try {
      const result = await deliveriesApi.reassignDelivery(deliveryId as number, Number(selectedLivreurId));
      if (result) {
        addToast({ variant: "success", title: "Réaffectation réussie", description: "La livraison a été réassignée." });
        setReassignModalOpen(false);
        loadOrder();
      } else {
        addToast({ variant: "error", title: "Erreur", description: "Impossible de réaffecter la livraison." });
      }
    } catch {
      addToast({ variant: "error", title: "Erreur", description: "Impossible de réaffecter la livraison." });
    } finally {
      setReassignLoading(false);
    }
  }, [selectedLivreurId, order, addToast, loadOrder]);

  const startCamera = useCallback(async () => {
    setScanError("");
    await stopCamera();
    await new Promise(r => setTimeout(r, 50));
    const el = readerRef.current;
    if (!el) {
      setScanError("Erreur technique : élément introuvable");
      return;
    }
    try {
      if (!qrRef.current) {
        qrRef.current = new Html5Qrcode(readerId);
      }
      if (!mountedRef.current) return;
      setScanning(true);
      await qrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!mountedRef.current) return;
          setScanning(false);
          await stopCamera();
          const uuid = decodedText.trim();
          if (!uuid) return;
          await handleScan(uuid);
          if (mountedRef.current && restartRef.current) {
            restartRef.current = false;
            if (scanSucceededRef.current) {
              startCamera();
            } else {
              setTimeout(() => {
                if (mountedRef.current && scanModalOpenRef.current) startCamera();
              }, 2000);
            }
          }
        },
        () => {},
      );
    } catch (err) {
      console.error("startCamera error:", err);
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("permission") || msg.includes("NotAllowed")) {
          setScanError("Accès caméra refusé. Autorisez-la dans les paramètres.");
        } else if (msg.includes("NotFoundError")) {
          setScanError("Aucune caméra trouvée sur cet appareil.");
        } else {
          setScanError("Impossible d'accéder à la caméra");
        }
        setScanning(false);
      }
    }
  }, [stopCamera, handleScan]);

  useEffect(() => {
    if (scanModalOpen) {
      const id = setTimeout(() => startCamera(), 200);
      return () => clearTimeout(id);
    } else {
      clearCamera();
      setScanError("");
    }
  }, [scanModalOpen, startCamera, clearCamera]);

  const layoutRole = user?.role || "admin";

  if (loading) {
    return (
      <DashboardLayout role={layoutRole}>
        <OrderSkeleton />
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role={layoutRole}>
        <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] px-4">
          <p className="text-gray-600">Commande non trouvée</p>
        </div>
      </DashboardLayout>
    );
  }

  const items: OrderItem[] =
    order.products && Array.isArray(order.products)
      ? order.products
      : order.items && Array.isArray(order.items)
        ? order.items
        : [];

  const fulfillmentResolved = items.length > 0 && items.every(
    (it) => ["available", "unavailable"].includes(it.fulfillmentStatus || "")
  );

  const allItemsDone = items.length > 0 && items.every(
    (it) => it.colis_statut && it.colis_statut !== "preparing"
  );

  const statusRaw = String(order.status ?? "")
    .toLowerCase()
    .trim();
  const deliveryFieldsLocked = [
    "awaiting_payment", "preparing", "prete",
    "in_delivery", "forwarded", "delivered", "cancelled", "returned",
    "echec"
  ].includes(statusRaw);

  const delivery = order.delivery || {};
  const datePrevue = parseIsoToDate(delivery.datePrevue as string | undefined);
  const fraisVal = parseOptionalNumber(order.frais_livraison) ?? parseOptionalNumber(delivery.frais);
  const livreurName = (delivery.livreur_name as string) || "";
  const livreurPhone = (delivery.livreur_phone as string) || "";
  const mmProvider = (order as any).mobile_money_provider || "";

  const finalOrderId =
    order.order_number || order.order_number === 0 ? order.order_number : order.id;
  const breadcrumbOrderNumber = `CMD${String(finalOrderId).padStart(4, "0")}`;

  const history = (order as { history?: { event: string; date: string }[] }).history;

  const syncFraisLivraison = async (frais: number) => {
    if (deliveryFieldsLocked || !isManager) return;
    try {
      await ordersApi.updateOrder(orderId, { frais_livraison: frais });
      setOrder(prev => prev ? { ...prev, frais_livraison: frais } : prev);
    } catch (err) {
      console.error("Failed to sync frais", err);
    }
  };

  const syncDatePrevue = async (date: Date) => {
    if (deliveryFieldsLocked || !isManager) return;
    try {
      const patch = { delivery: { datePrevue: date.toISOString() } };
      const res = await ordersApi.updateOrder(orderId, patch);
      if (res.success) {
        setOrder(prev => prev ? {
          ...prev,
          delivery: { ...prev.delivery, datePrevue: date.toISOString() }
        } : prev);
      }
    } catch (err) {
      console.error("Failed to sync date", err);
    }
  };

  const allColisFinalized = colisList.length > 0 && colisList.every(
    (c) => c.statut !== "preparing"
  );
  const canScan = statusRaw === "preparing" && !allColisFinalized && items.length > 0;

interface DeliveryCardProps {
  order: Order;
  delivery: Record<string, any>;
  deliveryFieldsLocked: boolean;
  fulfillmentResolved: boolean;
  livreurName: string;
  livreurPhone: string;
  livreurQuota?: number | null;
  livreurCharge?: number | null;
  datePrevue: Date | null;
  fraisVal: number | null;
  mmProvider: string;
  statusRaw: string;
  onSyncFrais: (frais: number) => void;
  onSyncDate: (date: Date) => void;
  onRequestPayment: () => void;
  onValidateCOD: () => void;
  onReassign: () => void;
}

function DeliveryCard({
  order, delivery, deliveryFieldsLocked, fulfillmentResolved,
  livreurName, livreurPhone, livreurQuota, livreurCharge, datePrevue, fraisVal, mmProvider, statusRaw,
  onSyncFrais, onSyncDate, onRequestPayment, onValidateCOD, onReassign,
}: DeliveryCardProps) {
  const [localFrais, setLocalFrais] = useState("");
  useEffect(() => {
    setLocalFrais(fraisVal !== null ? String(fraisVal) : "");
  }, [fraisVal]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm h-full">
      <div className="mb-5 flex items-center gap-3">
        <Truck className="h-5 w-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Gestion de {!order.zone_livraison_nom ? "l'expédition" : "la livraison"}</h2>
      </div>
      {!deliveryFieldsLocked && (
        <div className="mb-6">
          {livreurName ? (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <User className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{!order.zone_livraison_nom ? "Expéditeur assigné" : "Livreur assigné"}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 shrink-0">{livreurName}</span>
                      {livreurQuota != null && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                (livreurCharge ?? 0) >= livreurQuota ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, ((livreurCharge ?? 0) / livreurQuota) * 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium tabular-nums shrink-0 ${
                            (livreurCharge ?? 0) >= livreurQuota ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {livreurCharge ?? 0}/{livreurQuota}
                          </span>
                        </div>
                      )}
                    </div>
                {livreurPhone && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {livreurPhone}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Assignation automatique en cours…</p>
          )}
        </div>
      )}

      {deliveryFieldsLocked ? (
        <>
        {!order.zone_livraison_nom ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">Expéditeur</span>
                <span className="truncate text-sm font-semibold text-gray-900">{livreurName || "—"}</span>
                {livreurName && livreurPhone && (
                  <span className="text-xs text-gray-500">{livreurPhone}</span>
                )}
                {livreurQuota != null && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${(livreurCharge ?? 0) >= livreurQuota ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, ((livreurCharge ?? 0) / livreurQuota) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium tabular-nums shrink-0 ${(livreurCharge ?? 0) >= livreurQuota ? 'text-red-600' : 'text-green-600'}`}>
                      {livreurCharge ?? 0}/{livreurQuota}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">Coopérative</span>
                <span className="truncate text-sm font-semibold text-gray-900">{delivery.cooperative_nom as string || "—"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">Numéro suivi</span>
                <span className="truncate text-sm font-semibold text-gray-900">{delivery.cooperative_numero_suivi as string || "—"}</span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">Date expédition</span>
                <span className="text-sm font-semibold text-gray-900">
                  {delivery.shipped_at ? new Date(delivery.shipped_at as string).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">Date prévue</span>
                <span className="text-sm font-semibold text-gray-900">
                  {delivery.datePrevue || delivery.date_prevue ? new Date((delivery.datePrevue || delivery.date_prevue) as string).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">Date réelle</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(delivery.date_reelle || delivery.dateReelle) ? new Date((delivery.date_reelle || delivery.dateReelle) as string).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">{!order.zone_livraison_nom ? "Expéditeur" : "Livreur"}</span>
                <span className="truncate text-sm font-semibold text-gray-900">{livreurName || "—"}</span>
                {livreurQuota != null && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${(livreurCharge ?? 0) >= livreurQuota ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, ((livreurCharge ?? 0) / livreurQuota) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium tabular-nums shrink-0 ${(livreurCharge ?? 0) >= livreurQuota ? 'text-red-600' : 'text-green-600'}`}>
                      {livreurCharge ?? 0}/{livreurQuota}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                <span className="text-xs text-gray-500">{!order.zone_livraison_nom ? "Téléphone expéditeur" : "Téléphone livreur"}</span>
                <span className="truncate text-sm font-semibold text-gray-900">{livreurPhone || "—"}</span>
              </div>
            </div>
          </div>
        )}
        {statusRaw === "echec" && (
          <Button onClick={onReassign} className="mt-4 w-full" variant="destructive">
            Réaffecter à un autre livreur
          </Button>
        )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryFee" className="text-xs font-medium text-gray-600">
                {!order.zone_livraison_nom ? "Frais d'expédition (Ar)" : "Frais de livraison (Ar)"}
              </Label>
              <Input
                id="deliveryFee"
                type="number"
                value={localFrais}
                disabled={deliveryFieldsLocked || !fulfillmentResolved || !isManager}
                min={0}
                placeholder="Ex: 5000"
                className={`h-10 ${deliveryFieldsLocked || !isManager ? "bg-gray-100" : ""}`}
                onChange={(e) => setLocalFrais(e.target.value)}
                onBlur={() => {
                  if (!localFrais) return;
                  const frais = Math.max(0, parseInt(localFrais, 10));
                  onSyncFrais(frais);
                }}
              />

            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">Date prevue</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-10 w-full justify-start text-left font-normal ${deliveryFieldsLocked || !isManager ? "bg-gray-100 text-gray-500" : ""}`}
                    disabled={deliveryFieldsLocked || !fulfillmentResolved || !isManager}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {datePrevue ? format(datePrevue, "dd/MM/yyyy", { locale: fr }) : "Selectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={datePrevue ?? undefined}
                    onSelect={(d) => { if (d && !deliveryFieldsLocked && fulfillmentResolved && isManager) onSyncDate(d); }}
                    disabled={(date) => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-medium text-gray-600">Date reelle</Label>
              <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900">
                {delivery.dateReelle
                  ? format(parseIsoToDate(delivery.dateReelle as string)!, "dd/MM/yyyy HH:mm", { locale: fr })
                  : "Pas encore livree"}
              </div>
            </div>
          </div>

          {/* Boutons action */}
          {statusRaw === "confirmed" && (
            <div className="mt-6">
              {order.mode_paiement === "mobile_money" ? (
                <>
                  <Button onClick={onRequestPayment} disabled={!localFrais || Number(localFrais) <= 0 || !fulfillmentResolved}
                    className="h-12 w-full text-base font-semibold disabled:opacity-50">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Valider
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">
                    {!fulfillmentResolved ? "En attente de la validation des artisans."
                      : !localFrais || Number(localFrais) <= 0
                        ? `Définissez d'abord les frais ${!order.zone_livraison_nom ? "d'expédition" : "de livraison"} ci-dessus.`
                        : "Validez les frais et la date pour demander le paiement au client."}
                  </p>
                </>
              ) : (
                <>
                  <Button onClick={onValidateCOD} disabled={!localFrais || Number(localFrais) <= 0 || !fulfillmentResolved}
                    className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Valider la commande
                  </Button>
                  <p className="mt-2 text-xs text-gray-500">
                    {!fulfillmentResolved ? "En attente de la validation des artisans."
                      : !localFrais || Number(localFrais) <= 0
                        ? `Définissez d'abord les frais ${!order.zone_livraison_nom ? "d'expédition" : "de livraison"} ci-dessus.`
                        : "Validez les frais et la date pour lancer la préparation."}
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}



  return (
    <DashboardLayout role={layoutRole}>
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/dashboard/admin/orders" className="transition hover:text-gray-900">
              Commandes
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">{breadcrumbOrderNumber}</span>
          </nav>

          <OrderHeaderFull order={order} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

            {/* ROW 1: Produits (60%) + Infos client (40%) */}
            <div className="lg:col-span-3 lg:relative">
              <div ref={productsRef} className="overflow-auto max-lg:max-h-[400px] lg:absolute lg:inset-0">
                <ProductsTable items={items} className="h-full" highlightedItemIds={highlightedItemIds} hideStatus={["prete", "in_delivery", "forwarded", "delivered", "cancelled", "returned"].includes(statusRaw)} />
              </div>
            </div>
            <div className="lg:col-span-2">
              <CustomerInfo order={order} className="h-full" />
            </div>

            {/* ROW 2: Livraison + Paiement */}
            <div className="lg:col-span-3">
              <DeliveryCard
                order={order}
                delivery={delivery}
                deliveryFieldsLocked={deliveryFieldsLocked}
                fulfillmentResolved={fulfillmentResolved}
                livreurName={livreurName}
                livreurPhone={livreurPhone}
                livreurQuota={delivery.livreur_quota}
                livreurCharge={delivery.livreur_charge}
                datePrevue={datePrevue}
                fraisVal={fraisVal}
                mmProvider={mmProvider}
                statusRaw={statusRaw}
                onSyncFrais={syncFraisLivraison}
                onSyncDate={syncDatePrevue}
                onRequestPayment={isManager ? handleRequestPayment : undefined}
                onValidateCOD={isManager ? handleValidateCOD : undefined}
                onReassign={isManager ? handleOpenReassignModal : undefined}
              />
            </div>
            <div className="lg:col-span-2">
              <PaymentSummary
                order={order}
                className="h-full"
                onConfirmPayment={isManager && statusRaw === "awaiting_payment" ? handleConfirmMobilePayment : undefined}
                confirmLoading={confirmLoading}
                onRejectPayment={isManager && statusRaw === "awaiting_payment" ? handleRejectPayment : undefined}
                rejectLoading={rejectLoading}
              />
            </div>

            {/* ROW 3: Historique */}
            {history && history.length > 0 && (
              <div className="lg:col-span-5">
                <div className="rounded-lg border bg-white p-5 shadow-sm h-full">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Historique</h3>
                  <ul className="space-y-2 text-sm">
                    {history.map((item, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-gray-900">{item.event}</span>
                        <br />
                        <span className="text-xs text-gray-500">{item.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ROW 4: Colis */}
            {colisList.length > 0 && (
              <div className="lg:col-span-5">
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Colis</h2>
                    <span className="ml-auto text-sm text-gray-500">{colisList.length} colis</span>
                  </div>
                  <div className="space-y-3">
                    {colisList.map((c) => (
                      <ColisCardRow key={c.id} colis={c} highlighted={selectedColisId === c.id} onSelect={handleColisSelect} onScan={canScan ? () => { setScanTargetUuid(c.uuid); setScanModalOpen(true); } : undefined} />
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Scan modal */}
      <Dialog open={scanModalOpen} onOpenChange={(open) => { if (!open) { clearCamera(); setScanModalOpen(false); setScanTargetUuid(null); setScanError(""); } }}>
        <DialogContent className="sm:max-w-sm p-0 gap-0">
          <DialogTitle className="sr-only">Scanner le QR code du colis</DialogTitle>
          <div
            id={readerId}
            ref={readerRef}
            className="w-full overflow-hidden rounded-t-lg bg-black"
            style={{ minHeight: 320, maxHeight: 320 }}
          />
          <div className="px-4 py-3 space-y-2">
            {scanError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <X className="h-4 w-4 shrink-0" />
                <span>{scanError}</span>
              </div>
            ) : scanProcessing ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Traitement…
              </div>
            ) : scanning ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche du QR code…
              </div>
            ) : (
              <p className="text-sm text-gray-500">Placez le QR code devant la caméra</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign modal */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réaffecter la livraison</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">
              Sélectionnez un nouveau livreur pour cette livraison. Le statut repassera en "En attente".
            </p>
            <Select value={selectedLivreurId} onValueChange={setSelectedLivreurId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un livreur" />
              </SelectTrigger>
              <SelectContent>
                {reassignLivreurs.map((l: any) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.prenom} {l.nom} — {l.telephone || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReassignModalOpen(false)}>Annuler</Button>
            <Button onClick={handleReassign} disabled={!selectedLivreurId || reassignLoading}>
              {reassignLoading ? "Réaffectation…" : "Confirmer la réaffectation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
