import { query } from "../db.server";
import type { DbReversement, DbDemandePaiement, ArtisanStats } from "../types";

const COMMISSION_RATE = 0.05;
const PAYOUT_COOLDOWN_DAYS = 7;

export async function calculateArtisanBalance(artisanId: string): Promise<number> {
  const earned = await query<{ total: number }[]>`
    SELECT COALESCE(SUM(montant_net), 0) as total
    FROM public.reversements_artisan WHERE artisan_id = ${artisanId}
  `;
  const paid = await query<{ total: number }[]>`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM public.demandes_paiement WHERE artisan_id = ${artisanId} AND statut = 'paid'
  `;
  return Number(earned[0]?.total ?? 0) - Number(paid[0]?.total ?? 0);
}

export async function createReversement(
  orderId: string,
  artisanId: string,
  montantBrut: number
) {
  const commission = Math.round(montantBrut * COMMISSION_RATE * 100) / 100;
  const montantNet = montantBrut - commission;
  const rows = await query<DbReversement[]>`
    INSERT INTO public.reversements_artisan (order_id, artisan_id, montant_brut, commission, montant_net)
    VALUES (${orderId}, ${artisanId}, ${montantBrut}, ${commission}, ${montantNet})
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function createDemandePaiement(
  artisanId: string,
  montant: number,
  hubId?: string,
  modePaiement?: string,
  referenceMm?: string,
  titulaireMm?: string
) {
  const lastDemande = await query<DbDemandePaiement[]>`
    SELECT date_demande FROM public.demandes_paiement
    WHERE artisan_id = ${artisanId} AND statut = 'paid'
    ORDER BY date_demande DESC LIMIT 1
  `;
  if (lastDemande.length > 0) {
    const lastDate = new Date(lastDemande[0].date_demande);
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < PAYOUT_COOLDOWN_DAYS) {
      return { error: `Vous devez attendre ${Math.ceil(PAYOUT_COOLDOWN_DAYS - daysSince)} jours avant une nouvelle demande.` };
    }
  }

  const balance = await calculateArtisanBalance(artisanId);
  if (montant > balance) {
    return { error: `Solde insuffisant. Disponible: ${balance.toFixed(2)} €` };
  }

  const rows = await query<DbDemandePaiement[]>`
    INSERT INTO public.demandes_paiement (artisan_id, montant, hub_id, mode_paiement_artisan, reference_mm, titulaire_mm)
    VALUES (${artisanId}, ${montant}, ${hubId ?? null}, ${modePaiement ?? ''}, ${referenceMm ?? ''}, ${titulaireMm ?? ''})
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getArtisanOrdersStats(artisanId: string): Promise<ArtisanStats> {
  const products = await query<{ count: number }[]>`
    SELECT COUNT(*) as count FROM public.products WHERE user_id = ${artisanId}
  `;
  const orders = await query<{ count: number }[]>`
    SELECT COUNT(DISTINCT o.id) as count FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.user_id = ${artisanId}
  `;
  const revenue = await query<{ total: number }[]>`
    SELECT COALESCE(SUM(r.montant_net), 0) as total
    FROM public.reversements_artisan r WHERE r.artisan_id = ${artisanId}
  `;
  const pendingPayouts = await query<{ total: number }[]>`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM public.demandes_paiement WHERE artisan_id = ${artisanId} AND statut = 'pending'
  `;
  const balance = await calculateArtisanBalance(artisanId);
  const recentOrders = await query<Record<string, unknown>[]>`
    SELECT o.id, o.status, o.total, o.date_creation, oi.product_name, oi.quantity, oi.unit_price
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.user_id = ${artisanId}
    ORDER BY o.date_creation DESC LIMIT 20
  `;

  return {
    productsCount: Number(products[0]?.count ?? 0),
    ordersCount: Number(orders[0]?.count ?? 0),
    totalRevenue: Number(revenue[0]?.total ?? 0),
    pendingPayouts: Number(pendingPayouts[0]?.total ?? 0),
    availableBalance: balance,
    recentOrders,
  };
}
