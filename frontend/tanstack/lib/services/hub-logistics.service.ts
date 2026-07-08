import { query } from "../db.server";
import { determinePaymentMethod, assignHubDestination, calculateShippingFee } from "./order-workflow";
import type { DbLivraison, DbHub, LivreurDashboardStats, HubWithStats, DbZoneLivraison } from "../types";

export async function assignDeliveryPerson(zoneId: string, hubId: string) {
  const livreurs = await query<{ id: string; full_name: string; quota: number; charge: number }[]>`
    SELECT u.id, u.full_name, 
      COALESCE(u.quota_quotidien, 8) as quota,
      (SELECT COUNT(*) FROM public.livraisons l 
       WHERE l.livreur_id = u.id AND l.statut_paiement NOT IN ('paye', 'refuse')
       AND l.date_creation::date = CURRENT_DATE) as charge
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE ur.role = 'livreur' AND u.is_active = true
    AND (u.zone_livraison_id = ${zoneId} OR u.id IN (
      SELECT utilisateur_id FROM public.utilisateurs_utilisateur_zones_livraison WHERE zonelivraison_id = ${zoneId}
    ))
    ORDER BY charge ASC LIMIT 1
  `;
  if (livreurs.length > 0) return livreurs[0];

  const fallback = await query<{ id: string; full_name: string }[]>`
    SELECT u.id, u.full_name FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE ur.role = 'livreur' AND u.is_active = true AND u.hub_id = ${hubId}
    ORDER BY u.created_at ASC LIMIT 1
  `;
  return fallback[0] ?? null;
}

export async function estimateDeliveryDays(zoneId: string | null): Promise<number> {
  if (!zoneId) return 2;
  const rows = await query<{ delai_estime_jours: number }[]>`SELECT delai_estime_jours FROM public.zones_livraison WHERE id = ${zoneId}`;
  return rows[0]?.delai_estime_jours ?? 2;
}

export async function createOrderLivraisonPlaceholder(orderId: string, zoneId: string | null, hubDestId: string) {
  const livreur = await assignDeliveryPerson(zoneId || "", hubDestId);
  const delai = await estimateDeliveryDays(zoneId);
  const datePrevue = new Date(Date.now() + delai * 24 * 60 * 60 * 1000).toISOString();

  const rows = await query<DbLivraison[]>`
    INSERT INTO public.livraisons (order_id, livreur_id, hub_destination_id, zone_livraison_id, date_prevue, montant_du)
    VALUES (${orderId}, ${livreur?.id ?? null}, ${hubDestId}, ${zoneId ?? null}, ${datePrevue}, 0)
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function getZonesByVille(ville: string) {
  const rows = await query<DbZoneLivraison & { hub_nom: string }[]>`
    SELECT z.*, h.nom as hub_nom
    FROM public.zones_livraison z
    JOIN public.hubs h ON h.id = z.hub_id
    WHERE LOWER(z.ville) LIKE ${`%${ville.toLowerCase()}%`} AND z.actif = true
    ORDER BY z.nom ASC
  `;
  return rows;
}

export async function getHubsWithStats() {
  const rows = await query<HubWithStats[]>`
    SELECT h.*,
      (SELECT COUNT(*) FROM public.zones_livraison WHERE hub_id = h.id) as zones_count,
      (SELECT COUNT(*) FROM public.livraisons WHERE hub_destination_id = h.id AND date_creation::date = CURRENT_DATE) as livraisons_aujourdhui
    FROM public.hubs h ORDER BY h.nom ASC
  `;
  return rows;
}

export async function getLivreurDashboard(livreurId: string): Promise<LivreurDashboardStats> {
  const assignedToday = await query<{ count: number }[]>`
    SELECT COUNT(*) as count FROM public.livraisons
    WHERE livreur_id = ${livreurId} AND date_creation::date = CURRENT_DATE
    AND statut_paiement NOT IN ('paye', 'refuse')
  `;
  const inDelivery = await query<{ count: number }[]>`
    SELECT COUNT(*) as count FROM public.livraisons l
    JOIN public.orders o ON o.id = l.order_id
    WHERE l.livreur_id = ${livreurId} AND o.status = 'in_delivery'
  `;
  const toCollect = await query<{ count: number }[]>`
    SELECT COUNT(*) as count FROM public.livraisons l
    JOIN public.orders o ON o.id = l.order_id
    WHERE l.livreur_id = ${livreurId} AND o.status = 'prete'
  `;
  const completedToday = await query<{ count: number }[]>`
    SELECT COUNT(*) as count FROM public.livraisons l
    JOIN public.orders o ON o.id = l.order_id
    WHERE l.livreur_id = ${livreurId} AND o.status = 'delivered'
    AND o.date_livraison::date = CURRENT_DATE
  `;
  const collectedThisMonth = await query<{ total: number }[]>`
    SELECT COALESCE(SUM(l.montant_encaisse), 0) as total FROM public.livraisons l
    JOIN public.orders o ON o.id = l.order_id
    WHERE l.livreur_id = ${livreurId} AND o.status = 'delivered'
    AND o.date_livraison >= date_trunc('month', CURRENT_DATE)
  `;
  const successRate = await query<{ rate: number }[]>`
    SELECT 
      COUNT(*) FILTER (WHERE o.status IN ('delivered', 'forwarded')) * 100.0 / NULLIF(COUNT(*), 0) as rate
    FROM public.livraisons l
    JOIN public.orders o ON o.id = l.order_id
    WHERE l.livreur_id = ${livreurId}
  `;

  return {
    assignedToday: Number(assignedToday[0]?.count ?? 0),
    inDelivery: Number(inDelivery[0]?.count ?? 0),
    toCollect: Number(toCollect[0]?.count ?? 0),
    completedToday: Number(completedToday[0]?.count ?? 0),
    collectedThisMonth: Number(collectedThisMonth[0]?.total ?? 0),
    successRate: Math.round(Number(successRate[0]?.rate ?? 0)),
  };
}

export { determinePaymentMethod, assignHubDestination, calculateShippingFee };
