"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ordersApi } from "@/lib/api-client";
import {
  Order,
  OrderItem,
  OrderSkeleton,
  OrderHeaderFull,
  ProductsTable,
  PaymentSummary,
  DeliverySection,
  CustomerInfo,
} from "@/components/orders/order-detail-shared";
import { ChevronRight, Download, Package, CreditCard, CheckCircle, Clipboard, Send } from "lucide-react";
import { useAppToast } from "@/context/toast-context";

async function downloadFile(url?: string, filename?: string) {
  if (!url || !filename) return;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch {
    // silent
  }
}

function OrderError({ message }: { message: string }) {
  return (
    <DashboardLayout role="client">
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <div className="text-xl font-semibold text-red-700">Erreur</div>
            <div className="text-sm text-red-600">{message}</div>
            <Link
              href="/dashboard/client/orders"
              className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Retour aux commandes
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function QRCodeSection({ order, fullHeight }: { order: Order; fullHeight?: boolean }) {
  const qr = (order.qr_code || order.qrCode) as string;
  const factureId = (order as any).facture_id as string | number | undefined;
  const orderId =
    order.order_number || order.order_number === 0 ? order.order_number : order.id;

  return (
    <div className={`rounded-lg border bg-white shadow-sm ${fullHeight ? "flex w-full h-full flex-col p-4" : "p-4"}`}>
      <div className={`flex items-center justify-center rounded-lg bg-gray-50 ${fullHeight ? "flex-1" : "p-3"}`}>
        {qr ? (
          <Image
            src={qr}
            alt="QR Code commande"
            width={fullHeight ? 180 : 150}
            height={fullHeight ? 180 : 150}
            className={fullHeight ? "h-[180px] w-[180px]" : "h-[150px] w-[150px]"}
            style={{ width: fullHeight ? 180 : 150, height: fullHeight ? 180 : 150 }}
          />
        ) : (
          <div className={`flex items-center justify-center rounded-lg bg-gray-200 ${fullHeight ? "h-[180px] w-[180px]" : "h-[150px] w-[150px]"}`}>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => qr && downloadFile(qr, `CMD${String(orderId).padStart(4, "0")}-qr.png`)}
          disabled={!qr}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          QR
        </button>
        {factureId && (
          <Link
            href={`/dashboard/client/facture/${order.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Download className="h-3.5 w-3.5" />
            Facture
          </Link>
        )}
      </div>
    </div>
  );
}

function PaymentInfoSection({
  order,
  orderId,
  onPaymentConfirmed,
}: {
  order: Order;
  orderId: string;
  onPaymentConfirmed: (updatedOrder: Order) => void;
}) {
  const { addToast } = useAppToast();
  const statusRaw = String(order.status ?? order.statut ?? "").toLowerCase().trim();
  if (statusRaw !== "awaiting_payment") return null;

  const existingRef = (order as any).payment_transaction_ref || "";
  const [ref, setRef] = useState(existingRef);
  const [loading, setLoading] = useState(false);
  const submitted = existingRef !== "";

  const provider = order.mobile_money_provider || "";
  const holder = (order as any).payment_account_holder || "";
  const number = (order as any).payment_account_number || "";
  const providerColor: Record<string, string> = {
    "MVola": "text-yellow-700",
    "Airtel Money": "text-red-700",
    "Orange Money": "text-orange-700",
  };
  const color = providerColor[provider] || "text-amber-700";

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRef(text);
    } catch {
      // fallback
    }
  };

  const handleValidate = async () => {
    if (!ref.trim()) return;
    setLoading(true);
    try {
      const res = await ordersApi.notifyPayment(orderId, ref.trim());
      if (res.success) {
        addToast({ title: "Paiement signalé", description: "L'administrateur va vérifier.", variant: "success" });
        onPaymentConfirmed(res.data as Order);
      } else {
        addToast({ title: "Erreur", description: res.error || "Erreur", variant: "error" });
      }
    } catch {
      addToast({ title: "Erreur réseau", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="mb-5 text-lg font-semibold text-gray-900">Information paiement</h3>

      <div className="flex-1 space-y-4 text-sm">
        <div>
          <span className="text-gray-500">Nom du compte : </span>
          <span className={`font-semibold ${color}`}>{holder}</span>
        </div>
        <div>
          <span className="text-gray-500">Numéro : </span>
          <span className={`font-semibold ${color}`}>{number}</span>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Référence transaction
          </label>
          <div className="relative">
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              disabled={submitted}
              placeholder="Ex: MV123ABC"
              className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 ${
                submitted
                  ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "border-gray-300 bg-white focus:border-amber-500 focus:ring-amber-500"
              }`}
            />
            {!submitted && (
              <button
                type="button"
                onClick={handlePaste}
                title="Coller"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Clipboard className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleValidate}
        disabled={!ref.trim() || loading || submitted}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          submitted
            ? "bg-gray-200 text-gray-500"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        <CheckCircle className="h-4 w-4" />
        {loading ? "Envoi en cours..." : submitted ? "Paiement signalé ✓" : "Valider le paiement"}
      </button>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = typeof params?.id === "string" ? params.id : "";
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("ID commande invalide");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await ordersApi.getOrder(orderId);
        if (response.success && response.data) {
          setOrder(response.data as Order);
        } else {
          setError(response.error || "Commande introuvable");
        }
      } catch {
        setError("Erreur lors du chargement de la commande");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) return <OrderSkeleton />;
  if (error || !order) return <OrderError message={error || "Commande introuvable"} />;

  const items: OrderItem[] =
    order.products && Array.isArray(order.products)
      ? order.products
      : order.items && Array.isArray(order.items)
        ? order.items
        : [];

  const paymentInfoVisible = String(order.status ?? order.statut ?? "").toLowerCase().trim() === "awaiting_payment";
  const statusRaw = String(order.status ?? order.statut ?? "").toLowerCase().trim();
  const isHorsZone = !order.zone_livraison_nom;

  const hasExpedition = isHorsZone && statusRaw === "forwarded" && order.delivery?.cooperative_nom;
  const finalOrderId =
    order.order_number || order.order_number === 0 ? order.order_number : order.id;
  const breadcrumbOrderNumber = `CMD${String(finalOrderId).padStart(4, "0")}`;

  const handlePaymentConfirmed = (updatedOrder: Order) => {
    setOrder(updatedOrder);
  };

  return (
    <DashboardLayout role="client">
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <Link href="/dashboard/client/orders" className="transition hover:text-gray-900">
              Commandes
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">{breadcrumbOrderNumber}</span>
          </nav>

          <OrderHeaderFull order={order} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-6">
            {/* ROW 1: Products + Customer */}
            <div className="lg:col-span-4 relative">
              <div className="absolute inset-0 overflow-auto">
                <ProductsTable items={items} className="h-full" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <CustomerInfo order={order} className="h-full" />
            </div>

            {/* ROW 2: Expedition section (DeliverySection) + Suivi / PaymentInfo */}
            {hasExpedition ? (
              <>
                <div className="lg:col-span-4">
                  <DeliverySection order={order} />
                </div>
                <div className="lg:col-span-2">
                  <div className="rounded-lg border bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <Send className="h-5 w-5 text-gray-700" />
                      <h2 className="text-lg font-semibold text-gray-900">Suivi</h2>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                          <span className="text-xs text-gray-500">Coopérative</span>
                          <span className="text-sm font-semibold text-gray-900">{order.delivery?.cooperative_nom}</span>
                        </div>
                        {order.delivery?.cooperative_numero_suivi && (
                          <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                            <span className="text-xs text-gray-500">Numéro de suivi</span>
                            <span className="text-sm font-semibold text-gray-900">{order.delivery.cooperative_numero_suivi}</span>
                          </div>
                        )}
                      </div>
                      {order.delivery?.shipped_at && (
                        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
                          <span className="text-xs text-gray-500">Expédié le</span>
                          <span className="text-sm font-semibold text-gray-900">{new Date(order.delivery.shipped_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={paymentInfoVisible ? "lg:col-span-4" : "lg:col-span-6"}>
                  <PaymentSummary order={order} className="h-full" />
                </div>
                {paymentInfoVisible && (
                <div className="lg:col-span-2">
                  <PaymentInfoSection
                    order={order}
                    orderId={orderId}
                    onPaymentConfirmed={handlePaymentConfirmed}
                  />
                </div>
                )}
              </>
            )}

            {/* ROW 3: PaymentSummary + QR (swapped with DeliverySection when hasExpedition) */}
            {hasExpedition ? (
              <div className="lg:col-span-4">
                <PaymentSummary order={order} className="h-full" />
              </div>
            ) : (
              <div className="lg:col-span-4">
                <DeliverySection order={order} />
              </div>
            )}
            <div className={`lg:col-span-2 ${hasExpedition ? "flex" : ""}`}>
              <QRCodeSection order={order} fullHeight={!!hasExpedition} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
