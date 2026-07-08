"use client";

import React from "react";
import { API_ORIGIN } from "@/lib/api-config";
import { getMesureLabel } from "@/lib/mesure-utils";
import { Package, Truck, User, Mail, Phone, MapPin, Building2, CheckCircle2, XCircle, Hash } from "lucide-react";

// ====== TYPES ======
export type ProductImage = string | { url?: string; image?: string };

export interface Variant {
  size?: string | number;
  taille?: string | number;
  color?: { name?: string; hex?: string; code?: string } | string;
}

export interface OrderItem {
  id: string | number;
  panierItemId?: number;
  product?: {
    name?: string;
    images?: ProductImage[];
    image?: string | ProductImage | null;
    artisan?: string;
  };
  name?: string;
  artisan?: string;
  image?: string;
  price: number | string;
  quantity: number;
  variant?: Variant;
  size?: string | number;
  color?: { name?: string; hex?: string; code?: string } | string;
  variation_size?: string | number;
  variation_color?: string;
  variation_color_name?: string;
  variation_id?: string | number | null;
  variation_type_mesure?: string;
  weight?: number;
  fulfillmentStatus?: string;
  fulfillmentQuantity?: number | null;
  colis_statut?: string;
  colis_mode?: string;
}

export interface Delivery {
  date_prevue?: string;
  date_reelle?: string;
  datePrevue?: string;
  dateReelle?: string;
  statut?: string;
  status?: string;
  livreur?: { name?: string; phone?: string; nom?: string; prenom?: string; telephone?: string } | string | number;
  livreur_name?: string;
  livreur_phone?: string;
  livreur_quota?: number | null;
  livreur_charge?: number | null;
  mode_paiement?: string;
  statut_paiement?: string;
  payment_status?: string;
  frais?: number | string;
  montant_du?: number | string;
  cooperative_nom?: string;
  cooperative_numero_suivi?: string;
  shipped_at?: string;
  [key: string]: unknown;
}

export interface Customer {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  phone?: string;
  telephone?: string;
  tel?: string;
  address?: string;
}

export interface Order {
  id: string | number;
  order_number?: string | number;
  created_at?: string;
  createdAt?: string;
  status?: string;
  statut?: string;
  mode_paiement?: string;
  products?: OrderItem[];
  items?: OrderItem[];
  amount?: number | string;
  total?: number | string;
  subtotal?: number | string;
  shipping_fee?: number | string;
  frais_livraison?: number | string;
  delivery?: Delivery;
  shipping?: Delivery;
  livreur?: Delivery["livreur"];
  client?: Customer;
  user?: Customer;
  customer?: Customer;
  client_email?: string;
  client_phone?: string;
  address?: string;
  delivery_address?: string;
  qr_code?: string;
  qrCode?: string;
  invoice_url?: string;
  invoiceUrl?: string;
  payment_status?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientName?: string;
  customerName?: string;
  deliveryAddress?: string;
  region?: string;
  zone_livraison_nom?: string;
  zone_livraison?: number | null;
  hub_destination_nom?: string;
  hub_destination?: number | null;
  mobile_money_provider?: string;
  payment_instructions?: string;
  payment_transaction_ref?: string;
  [key: string]: unknown;
}

// Import du mapping centralisé des statuts
import { getStatusStyle } from "@/lib/statusStyles";

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paye: { label: "Payé", color: "text-emerald-600" },
  paid: { label: "Payé", color: "text-emerald-600" },
  non_paye: { label: "Non payé", color: "text-red-600" },
  non_payé: { label: "Non payé", color: "text-red-600" },
  unpaid: { label: "Non payé", color: "text-red-600" },
  refuse: { label: "Refusé", color: "text-red-600" },
  partiel: { label: "Partiel", color: "text-amber-600" },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  // Anciens modes (compatibilité)
  especes: "Espèces",
  mvola: "Mvola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
  // Nouveaux modes standardisés
  mobile_money: "Mobile money",
  cash_on_delivery: "Paiement à la livraison",
  carte: "Carte",
};

const PROVIDER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "MVola": { text: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200" },
  "Airtel Money": { text: "text-red-600", bg: "bg-red-100", border: "border-red-200" },
  "Orange Money": { text: "text-orange-600", bg: "bg-orange-100", border: "border-orange-200" },
};

const DEFAULT_MM_STYLE = { text: "text-blue-800", bg: "bg-blue-100", border: "border-blue-100" };

export function formatDate(dateString?: string) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  } catch {
    return "-";
  }
}

export function formatDateOnly(dateString?: string) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

export function formatPhone(phone?: string): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("261")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 10)} ${digits.slice(10)}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    const without0 = digits.slice(1);
    return `+261 ${without0.slice(0, 2)} ${without0.slice(2, 4)} ${without0.slice(4, 7)} ${without0.slice(7)}`;
  }
  return phone;
}

export function formatMoney(amount?: number | string): string {
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  const normalized = Number.isFinite(val as number) ? Number(val) : 0;
  return `Ar ${normalized.toLocaleString("fr-FR")}`;
}

export function getStatusConfig(status?: string) {
  if (!status) return { label: "En attente", color: "bg-orange-500" };
  
  // Utiliser le mapping centralisé pour le rôle client (par défaut)
  const style = getStatusStyle(status, 'client');
  return {
    label: style.label,
    color: style.color
  };
}

export function getPaymentStatusConfig(status?: string) {
  if (!status) return { label: "Non payé", color: "text-red-600" };
  const normalized = status.toLowerCase().replace(/é/g, "e").replace(/è/g, "e").replace(/\s/g, "_");
  return PAYMENT_STATUS_CONFIG[normalized] || { label: status, color: "text-gray-600" };
}

export function getPaymentMethodLabel(method?: string) {
  if (!method) return "-";
  const str = method.toLowerCase().replace(/ /g, "_");
  return PAYMENT_METHOD_LABEL[str] || method.replace(/_/g, " ");
}

export function pickFirstNonEmpty(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text !== "" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined") {
      return text;
    }
  }
  return "";
}

export function normalizeText(val?: string | number | null) {
  const normalized = pickFirstNonEmpty(val ?? "");
  return normalized || "-";
}

export function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveMediaUrl(src: string | null | undefined): string | null {
  if (!src || typeof src !== "string") return null;
  const t = src.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t) || t.startsWith("data:") || t.startsWith("blob:")) return t;
  const origin = API_ORIGIN.replace(/\/$/, "");
  if (t.startsWith("/")) return `${origin}${t}`;
  return `${origin}/${t}`;
}

const getProductImageSrc = (item: OrderItem): string | null => {
  // First try direct image field (Delivery structure)
  if (item.image && item.image.trim()) return item.image;
  
  // Then try nested product structure (Order structure)
  const productImage = item.product?.image;
  if (typeof productImage === "string" && productImage.trim()) return productImage;
  if (productImage != null && typeof productImage === "object") {
    const url = (productImage as { url?: string }).url;
    if (typeof url === "string" && url.trim()) return url;
  }
  if (Array.isArray(item.product?.images) && item.product.images[0]) {
    if (typeof item.product.images[0] === "string") {
      return item.product.images[0] as string;
    }
    if (typeof item.product.images[0] === "object" && "url" in item.product.images[0]) {
      return (item.product.images[0] as { url?: string }).url ?? null;
    }
  }
  return null;
};

export function getResolvedProductImageSrc(item: OrderItem): string | null {
  return resolveMediaUrl(getProductImageSrc(item));
}

export const getProductName = (item: OrderItem): string =>
  item.name || item.product?.name || "Produit";

export const getArtisan = (item: OrderItem): string =>
  item.artisan || item.product?.artisan || "";

export function OrderSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
      <div className="mx-auto space-y-6" style={{ maxWidth: 1200 }}>
        <div className="h-7 w-1/4 animate-pulse rounded bg-gray-300" />
        <div className="mb-4 w-full animate-pulse rounded-lg bg-white p-7 shadow-sm" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-44 animate-pulse rounded-lg bg-white p-6 shadow-sm" />
            <div className="h-36 animate-pulse rounded-lg bg-white p-6 shadow-sm" />
            <div className="h-32 animate-pulse rounded-lg bg-white p-6 shadow-sm" />
          </div>
          <div className="space-y-6">
            <div className="h-44 animate-pulse rounded-lg bg-white p-6 shadow-sm" />
            <div className="h-44 animate-pulse rounded-lg bg-white p-6 shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderHeaderFull({ order }: { order: Order }) {
  const orderId =
    order.order_number || order.order_number === 0 ? order.order_number : order.id;
  const num = String(orderId).padStart(4, "0");

  const date = order.created_at ?? order.createdAt;
  const statusConfig = getStatusConfig(order.status);

  let modePaiement =
    order.payment_method ||
    order.mode_paiement ||
    order.delivery?.mode_paiement ||
    order.shipping?.mode_paiement ||
    "";

  return (
    <div className="mb-6 w-full">
      <div className="grid w-full grid-cols-2 gap-6 rounded-lg border bg-white p-5 shadow-sm lg:grid-cols-4">
        <div>
          <div className="mb-1 text-xs text-gray-500">Numéro commande</div>
          <div className="text-base font-semibold text-gray-900">{`CMD${num}`}</div>
        </div>
        <div>
          <div className="mb-1 text-xs text-gray-500">Date commande</div>
          <div className="text-base font-semibold text-gray-900">{formatDate(date as string | undefined)}</div>
        </div>
        <div>
          <div className="mb-1 text-xs text-gray-500">Statut</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.color}`} />
            <span className="text-base font-semibold text-gray-900">{statusConfig.label}</span>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-gray-500">Mode paiement</div>
          {(order as any).mobile_money_provider ? (
            <div className={`text-base font-semibold ${
              PROVIDER_COLORS[(order as any).mobile_money_provider]?.text || "text-gray-900"
            }`}>
              {(order as any).mobile_money_provider}
            </div>
          ) : (
            <div className="text-base font-semibold text-gray-900">
              {getPaymentMethodLabel(modePaiement as string) || "Paiement à la livraison"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductVariantBadges({ item }: { item: OrderItem }) {
  const mesureLabel = getMesureLabel(item.variation_type_mesure);
  const taille = pickFirstNonEmpty(
    item.variant?.size,
    item.variant?.taille,
    item.size,
    item.variation_size,
  );

  const isHex = (value?: string) => !!value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);

  const variationColorRaw = pickFirstNonEmpty(item.variation_color);
  let colorHex = "";
  const variantColor = item.variant?.color;
  if (variantColor && typeof variantColor === "object") {
    colorHex = pickFirstNonEmpty(variantColor.hex, variantColor.code, colorHex);
  }
  if (item.color && typeof item.color === "object") {
    colorHex = pickFirstNonEmpty(colorHex, item.color.hex, item.color.code);
  }
  if (isHex(variationColorRaw)) {
    colorHex = pickFirstNonEmpty(colorHex, variationColorRaw);
  } else if (typeof variantColor === "string" && isHex(variantColor)) {
    colorHex = pickFirstNonEmpty(colorHex, variantColor);
  } else if (typeof item.color === "string" && isHex(item.color)) {
    colorHex = pickFirstNonEmpty(colorHex, item.color);
  }

  const colorName = pickFirstNonEmpty(
    item.variation_color_name,
    !isHex(variationColorRaw) ? variationColorRaw : "",
    typeof variantColor === "string" && !isHex(variantColor) ? variantColor : "",
    typeof variantColor === "object" ? variantColor.name : "",
    typeof item.color === "string" && !isHex(item.color) ? item.color : "",
    typeof item.color === "object" ? item.color.name : "",
  );

  const backgroundColor = isHex(colorHex) ? colorHex : colorName ? "#9CA3AF" : "";
  const showColorDot = !!isHex(colorHex) || !!colorName;

  const parts: string[] = [];
  if (taille) parts.push(`${mesureLabel}: ${taille}`);
  if (item.weight != null && Number(item.weight) > 0) parts.push(`${Number(item.weight)} kg`);

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {parts.length > 0 && (
        <div className="text-gray-700">{parts.join(" — ")}</div>
      )}
      <div>
        {showColorDot ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200"
              style={{ backgroundColor: backgroundColor || "#9CA3AF" }}
            />
            {colorName || "-"}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    </div>
  );
}

export function ProductsTable({ items, className = "", headerAction, highlightedItemIds, hideStatus, simpleStatus }: { items: OrderItem[]; className?: string; headerAction?: React.ReactNode; highlightedItemIds?: number[]; hideStatus?: boolean; simpleStatus?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm flex flex-col ${className}`}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Produits commandés</h2>
          <p className="text-sm text-gray-500">
            {items.length} article{items.length > 1 ? "s" : ""}
          </p>
        </div>
        {headerAction}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="min-w-[280px] px-3 py-3 text-left">Produit</th>
              <th className="min-w-[150px] px-3 py-3 text-left">Variantes</th>
              <th className="min-w-[130px] px-3 py-3 text-right">Prix unitaire</th>
              <th className="min-w-[100px] px-3 py-3 text-center">Qté</th>
              <th className="min-w-[130px] px-3 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const price = Number(item.price) || 0;
              const fq = item.fulfillmentQuantity;
              const displayQty = fq !== null && fq !== undefined ? fq : (item.quantity || 1);
              const lineTotal = price * displayQty;
              const imgSrc = getResolvedProductImageSrc(item);
              const rowKey = `${item.id}-${item.variation_id ?? "base"}`;
              const fs = item.fulfillmentStatus || "";
              const declined = fs === "unavailable";
              const partial = fq !== null && fq !== undefined && fq > 0 && fq < (item.quantity || 1);
              const isHighlighted = highlightedItemIds?.includes(Number(item.panierItemId ?? item.id));

              return (
                <tr key={rowKey} className={`border-b border-gray-100 transition-all duration-200 ${
                  isHighlighted
                    ? "bg-amber-50/70 ring-1 ring-inset ring-amber-200 border-l-4 border-l-amber-400"
                    : declined
                      ? "bg-gray-50 opacity-60"
                      : "hover:bg-gray-50"
                }`}>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      {imgSrc ? (
                        <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 ${declined ? "grayscale" : ""}`}>
                          <img
                            src={imgSrc}
                            alt={getProductName(item)}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className={`font-medium text-sm ${declined ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {getProductName(item)}
                        </div>
                        {getArtisan(item) && (
                          <div className={`text-xs ${declined ? "text-gray-300" : "text-gray-500"}`}>{getArtisan(item)}</div>
                        )}
                        {!hideStatus && (() => {
                          if (simpleStatus) {
                            return <>
                              {declined
                                ? <span className="inline-block mt-0.5 text-xs font-medium text-red-500">Indisponible</span>
                                : fs && <span className="inline-block mt-0.5 text-xs font-medium text-emerald-600">Disponible</span>
                              }
                            </>
                          }
                          return <>
                            {partial && <span className="inline-block mt-0.5 text-xs font-medium text-amber-600">Partiel</span>}
                            {fs === "available" && !partial && <span className="inline-block mt-0.5 text-xs font-medium text-emerald-600">Disponible</span>}
                            {declined && <span className="inline-block mt-0.5 text-xs font-medium text-red-500">Indisponible</span>}
                          </>
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <ProductVariantBadges item={item} />
                  </td>
                  <td className={`px-3 py-4 text-right font-semibold ${declined ? "text-gray-300" : "text-gray-900"}`}>{formatMoney(price)}</td>
                  <td className={`px-3 py-4 text-center ${declined ? "text-gray-300" : "text-gray-900"}`}>
                    {partial ? `${displayQty} / ${item.quantity}` : displayQty}
                  </td>
                  <td className={`px-3 py-4 text-right font-semibold ${declined ? "text-gray-300" : "text-gray-900"}`}>{formatMoney(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function computeSubtotalFromLineItems(order: Order): number | null {
  const lines = order.products?.length ? order.products : order.items;
  if (!lines?.length) return null;
  let sum = 0;
  let counted = false;
  for (const it of lines) {
    if (it.fulfillmentStatus === "unavailable") continue;
    const p = parseOptionalNumber(it.price);
    const fq = it.fulfillmentQuantity;
    const q =
      fq !== null && fq !== undefined
        ? fq
        : parseOptionalNumber(it.quantity);
    const qty = q !== null && q >= 0 ? q : 1;
    if (p === null) continue;
    counted = true;
    sum += p * qty;
  }
  return counted ? sum : null;
}

export function PaymentSummary({
  order,
  className = "",
  onConfirmPayment,
  confirmLoading,
  onRejectPayment,
  rejectLoading,
}: {
  order: Order;
  className?: string;
  onConfirmPayment?: () => void;
  confirmLoading?: boolean;
  onRejectPayment?: () => void;
  rejectLoading?: boolean;
}) {
  const statutPaiement =
    (order.payment_status as string) ||
    order.delivery?.statut_paiement ||
    order.delivery?.payment_status ||
    order.shipping?.statut_paiement ||
    order.shipping?.payment_status ||
    (order.statut_paiement as string) ||
    "";
  const paymentStatus = getPaymentStatusConfig(statutPaiement);

  const shippingFee = parseOptionalNumber(
    order.shipping_fee ??
      order.frais_livraison ??
      order.delivery?.frais ??
      order.shipping?.frais ??
      order.delivery?.montant_du ??
      order.shipping?.montant_du,
  );
  const apiTotal = parseOptionalNumber(order.total ?? order.amount);
  let subtotal = parseOptionalNumber(order.subtotal);

  if (subtotal === null && apiTotal !== null) {
    const frais = shippingFee ?? 0;
    subtotal = Math.max(0, apiTotal - frais);
  }
  if (subtotal === null) {
    subtotal = computeSubtotalFromLineItems(order);
  }

  const computedTotal =
    apiTotal !== null
      ? apiTotal
      : subtotal !== null || shippingFee !== null
        ? (subtotal ?? 0) + (shippingFee ?? 0)
        : null;

  const statusRaw = String(order.status ?? order.statut ?? "").toLowerCase().trim();
  const showPaymentSection = statusRaw === "awaiting_payment" && onConfirmPayment;

  const provider = (order as any).mobile_money_provider || "";
  const holder = (order as any).payment_account_holder || "";
  const number = (order as any).payment_account_number || "";
  const transactionRef = (order as any).payment_transaction_ref || "";
  const providerColor: Record<string, string> = {
    "MVola": "text-yellow-700",
    "Airtel Money": "text-red-700",
    "Orange Money": "text-orange-700",
  };
  const color = providerColor[provider] || "text-amber-700";

  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Résumé du paiement</h3>
        </div>
        <span
          className={`flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-semibold ${paymentStatus.color} bg-gray-100`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${paymentStatus.color.replace("text-", "bg-")}`}
          />
          {paymentStatus.label}
        </span>
      </div>
      <div className="space-y-4 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Sous-total</span>
          <span className="font-medium text-gray-900">{subtotal !== null ? formatMoney(subtotal) : "-"}</span>
        </div>

        <div className="flex justify-between text-gray-600">
          <span>{!order.zone_livraison_nom ? "Expédition" : "Livraison"}</span>
          <span className="font-medium text-gray-900">
            {shippingFee !== null ? formatMoney(shippingFee) : "-"}
          </span>
        </div>

        <div className="rounded-2xl bg-gray-50 px-4 py-4">
          <div className="flex justify-between text-sm font-semibold text-gray-900">
            <span>Total</span>
            <span>{computedTotal !== null ? formatMoney(computedTotal) : "-"}</span>
          </div>
        </div>
      </div>

      {transactionRef && (
        <>
          <hr className="my-4 border-t border-gray-200" />
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <Hash className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-gray-500">Réf. transaction :</span>
            <span className="font-mono font-semibold text-gray-900">{transactionRef}</span>
          </div>
        </>
      )}

      {showPaymentSection && (
        <>
          <hr className="my-4 border-t border-gray-200" />
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Nom du compte : </span>
              <span className={`font-semibold ${color}`}>{holder}</span>
            </div>
            <div>
              <span className="text-gray-500">Numéro : </span>
              <span className={`font-semibold ${color}`}>{number}</span>
            </div>

            {transactionRef ? (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onConfirmPayment}
                  disabled={confirmLoading || rejectLoading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                  {confirmLoading ? "Confirmation..." : "Valider"}
                </button>
                {onRejectPayment && (
                  <button
                    onClick={onRejectPayment}
                    disabled={confirmLoading || rejectLoading}
                    className="flex-1 rounded-lg border border-red-300 bg-white px-4 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="mr-1.5 inline h-4 w-4" />
                    {rejectLoading ? "Refus..." : "Refuser"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                En attente de confirmation du client...
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function DeliverySection({ order }: { order: Order }) {
  const delivery: Delivery = order.delivery || order.shipping || {};
  const deliveryDriver = typeof delivery.livreur === "object" && delivery.livreur ? delivery.livreur : null;
  const orderDriver = typeof order.livreur === "object" && order.livreur ? order.livreur : null;
  const livreur = pickFirstNonEmpty(
    delivery.livreur_name,
    deliveryDriver?.name,
    [deliveryDriver?.prenom, deliveryDriver?.nom].filter(Boolean).join(" "),
    orderDriver?.name,
    [orderDriver?.prenom, orderDriver?.nom].filter(Boolean).join(" "),
    typeof delivery.livreur === "string" ? delivery.livreur : "",
    typeof order.livreur === "string" ? order.livreur : "",
  );
  const phone = pickFirstNonEmpty(
    delivery.livreur_phone,
    deliveryDriver?.phone,
    deliveryDriver?.telephone,
    orderDriver?.phone,
    orderDriver?.telephone,
  );
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Truck className="h-5 w-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">{!order.zone_livraison_nom ? "Expédition" : "Livraison"}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
          <span className="text-xs text-gray-500">Date prévue</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatDateOnly(delivery.date_prevue || delivery.datePrevue)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
          <span className="text-xs text-gray-500">Date réelle</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatDate(delivery.date_reelle || delivery.dateReelle)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
          <span className="text-xs text-gray-500">{!order.zone_livraison_nom ? "Expéditeur" : "Livreur"}</span>
          <span className="text-sm font-semibold text-gray-900">{normalizeText(livreur)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-4">
          <span className="text-xs text-gray-500">{!order.zone_livraison_nom ? "Téléphone expéditeur" : "Téléphone livreur"}</span>
          <span className="text-sm font-semibold text-gray-900">{formatPhone(phone) || "-"}</span>
        </div>
      </div>
    </div>
  );
}

export function PaymentInstructionsBanner({ order }: { order: Order }) {
  const statusRaw = String(order.status ?? order.statut ?? "").toLowerCase().trim();
  if (statusRaw !== "awaiting_payment" || !(order as any).payment_instructions) return null;
  const provider = (order as any).mobile_money_provider;
  const providerColors: Record<string, string> = {
    "MVola": "bg-yellow-100 border-yellow-200 text-yellow-800",
    "Airtel Money": "bg-red-100 border-red-200 text-red-800",
    "Orange Money": "bg-orange-100 border-orange-200 text-orange-800",
  };
  const providerClass = provider ? providerColors[provider] || "bg-blue-100 border-blue-200 text-blue-800" : "";
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-amber-100 p-2">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-amber-900">Paiement en attente</h3>
        {provider && <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${providerClass}`}>{provider}</span>}
      </div>
      <div className="rounded-lg border border-amber-200 bg-white p-4 text-sm text-amber-800 whitespace-pre-line font-mono">
        {(order as any).payment_instructions}
      </div>
      <ol className="mt-3 list-decimal pl-4 text-xs text-amber-700 space-y-1">
        <li>Ouvrez votre application Mobile Money</li>
        <li>Effectuez le transfert vers le numéro indiqué</li>
        <li>Utilisez la référence <strong>CMD-{order.id}</strong> comme motif</li>
        <li>L&apos;administrateur confirmera le paiement sous peu</li>
      </ol>
      <p className="mt-3 text-xs text-gray-500">
        Une fois le paiement effectué, l&apos;administrateur validera votre commande et les artisans commenceront la préparation.
      </p>
    </div>
  );
}

export function CustomerInfo({ order, className = "" }: { order: Order; className?: string }) {
  const nom = pickFirstNonEmpty(
    order.client?.full_name,
    order.client?.name,
    [order.client?.first_name, order.client?.last_name].filter(Boolean).join(" "),
    [order.client?.prenom, order.client?.nom].filter(Boolean).join(" "),
    order.user?.full_name,
    order.user?.name,
    [order.user?.first_name, order.user?.last_name].filter(Boolean).join(" "),
    [order.user?.prenom, order.user?.nom].filter(Boolean).join(" "),
    order.customer?.full_name,
    order.customer?.name,
    [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" "),
    [order.customer?.prenom, order.customer?.nom].filter(Boolean).join(" "),
    order.clientName as string,
    order.customerName as string,
  );
  const email = pickFirstNonEmpty(
    order.clientEmail as string,
    order.client_email as string,
    order.client?.email,
    order.user?.email,
    order.customer?.email,
    order.customer_email as string,
    order.user_email as string,
  );
  const phone = pickFirstNonEmpty(
    order.clientPhone as string,
    order.client_phone as string,
    order.client?.phone,
    order.client?.telephone,
    order.client?.tel,
    order.user?.phone,
    order.user?.telephone,
    order.user?.tel,
    order.customer?.phone,
    order.customer?.telephone,
    order.customer?.tel,
    order.customer_phone as string,
    order.user_phone as string,
  );
  const address = pickFirstNonEmpty(
    order.deliveryAddress as string,
    order.delivery_address as string,
    order.client?.address,
    order.user?.address,
    order.customer?.address,
    order.address as string,
  );

  return (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Informations client</h3>
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <User className="mt-1 h-5 w-5 text-gray-400" />
          <div>
            <div className="text-xs font-medium text-gray-600">Nom complet</div>
            <div className="mt-1 text-gray-900">{normalizeText(nom)}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="mt-1 h-5 w-5 text-gray-400" />
          <div>
            <div className="text-xs font-medium text-gray-600">Email</div>
            <div className="mt-1 text-gray-900">{normalizeText(email)}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="mt-1 h-5 w-5 text-gray-400" />
          <div>
            <div className="text-xs font-medium text-gray-600">Téléphone</div>
            <div className="mt-1 text-gray-900">{normalizeText(phone)}</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 h-5 w-5 text-gray-400" />
          <div>
            <div className="text-xs font-medium text-gray-600">Adresse</div>
            <div className="mt-1 text-gray-900">{normalizeText(address)}</div>
          </div>
        </div>
        {(order.hub_destination_nom || order.zone_livraison_nom) && (
          <>
            <div className="border-t border-gray-100" />
            {order.hub_destination_nom && (
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-xs font-medium text-gray-600">Hub de destination</div>
                  <div className="mt-1 text-gray-900">{order.hub_destination_nom}</div>
                </div>
              </div>
            )}
            {order.zone_livraison_nom && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-xs font-medium text-gray-600">Zone de livraison</div>
                  <div className="mt-1 text-gray-900">{order.zone_livraison_nom}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
