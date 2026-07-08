import { query, unsafeQuery } from "../db.server";
import type { DbOrder, DbProduct, CronResult } from "../types";

export type OrderStatus =
  | "pending" | "confirmed" | "awaiting_payment" | "preparing"
  | "prete" | "in_delivery" | "delivered" | "cancelled"
  | "returned" | "forwarded" | "echec";

export type PaymentMethod = "cash_on_delivery" | "mobile_money";

const MM_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["awaiting_payment", "preparing", "cancelled"],
  awaiting_payment: ["preparing", "cancelled"],
  preparing: ["prete", "cancelled"],
  prete: ["in_delivery", "cancelled", "forwarded"],
  in_delivery: ["delivered", "echec", "cancelled", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
  forwarded: ["prete", "delivered"],
  echec: ["pending"],
};

const COD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  awaiting_payment: ["preparing", "cancelled"],
  preparing: ["prete", "cancelled"],
  prete: ["in_delivery", "cancelled", "forwarded"],
  in_delivery: ["delivered", "echec", "cancelled", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
  forwarded: ["prete", "delivered"],
  echec: ["pending"],
};

function getTransitions(paymentMethod?: PaymentMethod): Record<OrderStatus, OrderStatus[]> {
  return paymentMethod === "cash_on_delivery" ? COD_TRANSITIONS : MM_TRANSITIONS;
}

export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  extra?: { paymentMethod?: PaymentMethod; userId?: string; [key: string]: unknown }
) {
  const rows = await query<DbOrder>`SELECT * FROM public.orders WHERE id = ${orderId}`;
  const order = rows[0];
  if (!order) return { error: "Commande introuvable" };

  const transitions = getTransitions(extra?.paymentMethod || order.payment_method as PaymentMethod);
  const allowed = transitions[order.status as OrderStatus] ?? [];
  if (!allowed.includes(newStatus) && order.status !== newStatus) {
    return { error: `Transition invalide de "${order.status}" vers "${newStatus}"` };
  }

  const now = new Date().toISOString();
  const extraSets: string[] = [];
  const extraParams: string[] = [];
  let idx = 2;

  if (newStatus === "confirmed") { extraSets.push(`date_confirmation = $${idx}`); extraParams.push(now); idx++; }
  else if (newStatus === "preparing") { extraSets.push(`date_preparation = $${idx}`); extraParams.push(now); idx++; }
  else if (newStatus === "delivered") { extraSets.push(`date_livraison = $${idx}`); extraParams.push(now); idx++; }

  if (extraSets.length > 0) {
    await unsafeQuery(
      `UPDATE public.orders SET status = $1, ${extraSets.join(", ")} WHERE id = $${idx}`,
      [newStatus, ...extraParams, orderId]
    );
  } else {
    await query`UPDATE public.orders SET status = ${newStatus} WHERE id = ${orderId}`;
  }

  return { success: true, from: order.status, to: newStatus, orderId };
}

export async function determinePaymentMethod(
  region?: string,
  city?: string,
  hubSupportCod?: boolean
): Promise<PaymentMethod> {
  if (hubSupportCod === true) return "cash_on_delivery";
  if (hubSupportCod === false) return "mobile_money";
  const codCities = ["antananarivo", "tana", "analamanga"];
  if (city && codCities.includes(city.toLowerCase())) return "cash_on_delivery";
  const codRegions = ["analamanga"];
  if (region && codRegions.includes(region.toLowerCase())) return "cash_on_delivery";
  return "mobile_money";
}

export async function assignHubDestination(region?: string, city?: string) {
  if (!region && !city) return null;
  const hubs = await query<{ id: string; nom: string; region: string; ville: string }[]>`SELECT * FROM public.hubs WHERE actif = true ORDER BY nom ASC`;
  if (hubs.length === 0) return null;

  const byRegion = hubs.find((h) => h.region?.toLowerCase() === region?.toLowerCase());
  if (byRegion) return byRegion;

  const byCity = hubs.find((h) => h.ville?.toLowerCase() === city?.toLowerCase());
  if (byCity) return byCity;

  return hubs[0];
}

export async function calculateShippingFee(
  hubId: string,
  zoneId: string | null,
  totalWeightKg: number
): Promise<number> {
  if (!zoneId) return 0;
  const hubs = await query<{ prix_par_km: number; prix_par_kg: number }[]>`SELECT prix_par_km, prix_par_kg FROM public.hubs WHERE id = ${hubId}`;
  const hub = hubs[0];
  if (!hub) return 0;
  const zones = await query<{ distance_km: number }[]>`SELECT distance_km FROM public.zones_livraison WHERE id = ${zoneId}`;
  const zone = zones[0];
  if (!zone) return 0;
  const distance = Number(zone.distance_km ?? 0);
  const pricePerKm = Number(hub.prix_par_km ?? 0);
  const pricePerKg = Number(hub.prix_par_kg ?? 0);
  return (distance * pricePerKm) + (totalWeightKg * pricePerKg);
}

export async function autoCancelUnpaidOrders(): Promise<CronResult> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const reminderOrders = await query<{ id: string; id_utilisateur: string }[]>`
    SELECT id, id_utilisateur FROM public.orders
    WHERE status = 'awaiting_payment' AND date_creation <= ${twoDaysAgo}
    AND (reminder_sent_at IS NULL OR reminder_sent_at = '')
  `;
  for (const order of reminderOrders) {
    await query`UPDATE public.orders SET reminder_sent_at = ${now.toISOString()} WHERE id = ${order.id}`;
    await query`
      INSERT INTO public.notifications (user_id, type_notif, categorie, titre, message, icone, couleur)
      VALUES (${order.id_utilisateur}, 'relance_paiement', 'paiement', 'Paiement en attente', 'Votre commande vous attend encore. Effectuez le paiement sous 3 jours.', 'clock', 'warning')
    `;
  }

  const cancelOrders = await query<{ id: string; id_utilisateur: string }[]>`
    SELECT id, id_utilisateur FROM public.orders
    WHERE status = 'awaiting_payment' AND date_creation <= ${fiveDaysAgo}
  `;
  for (const order of cancelOrders) {
    await transitionOrderStatus(order.id, "cancelled");
    await query`
      INSERT INTO public.notifications (user_id, type_notif, categorie, titre, message, icone, couleur)
      VALUES (${order.id_utilisateur}, 'annulation_auto', 'commande', 'Commande annulée', 'Votre commande a été automatiquement annulée faute de paiement.', 'x-circle', 'destructive')
    `;
  }
  return { reminders: reminderOrders.length, cancelled: cancelOrders.length };
}

export async function autoReactivateProducts(): Promise<CronResult> {
  const now = new Date().toISOString();
  const rows = await query<{ id: string; user_id: string }[]>`
    UPDATE public.products SET statut = 'publie', suspendu_jusqua = NULL
    WHERE statut = 'suspendu' AND suspendu_jusqua IS NOT NULL AND suspendu_jusqua <= ${now}
    RETURNING id, user_id
  `;
  for (const row of rows) {
    await query`
      INSERT INTO public.notifications (user_id, type_notif, categorie, titre, message, icone, couleur)
      VALUES (${row.user_id ?? ''}, 'produit_reactived', 'produit', 'Produit réactivé', 'Votre produit a été automatiquement réactivé.', 'refresh-cw', 'success')
    `;
  }
  return { reactivated: rows.length };
}

export async function autoReactivateUsers(): Promise<CronResult> {
  const now = new Date().toISOString();
  const rows = await query<{ id: string }[]>`
    UPDATE public.users SET is_active = true
    WHERE is_active = false AND suspendu_jusqua IS NOT NULL AND suspendu_jusqua <= ${now}
    RETURNING id
  `;
  return { reactivated: rows.length };
}

export async function checkLowStock(): Promise<CronResult> {
  const rows = await query<{ id: string; product_id: string; stock: number; seuil_alerte: number; user_id: string }[]>`
    SELECT pv.id, pv.product_id, pv.stock, pv.seuil_alerte, p.user_id
    FROM public.product_variations pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.stock <= pv.seuil_alerte
  `;
  const results: { variationId: string; productId: string; stock: number }[] = [];
  for (const row of rows) {
    results.push({ variationId: row.id, productId: row.product_id, stock: row.stock });
    await query`
      INSERT INTO public.notifications (user_id, type_notif, categorie, titre, message, icone, couleur)
      VALUES (${row.user_id ?? ''}, 'stock_faible', 'stock', 'Stock faible', 'La variation #${row.id} a un stock de ${row.stock} (seuil: ${row.seuil_alerte}).', 'package', 'warning')
    `;
  }
  return { alerts: results };
}
