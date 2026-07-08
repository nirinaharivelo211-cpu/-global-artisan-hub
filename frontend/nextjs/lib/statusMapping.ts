// ====== DÉFINITION DES TYPES ======

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'awaiting_payment'
  | 'preparing'
  | 'prete'
  | 'in_delivery'
  | 'forwarded'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'echec';

export type ColisStatus =
  | 'preparing'
  | 'deposited'
  | 'dispatched'
  | 'collected';

// ====== MAPPINGS PAR RÔLE (Validation) ======

export const clientStatusMap: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  awaiting_payment: 'En attente de paiement',
  preparing: 'En préparation',
  prete: 'Prête',
  in_delivery: 'En livraison',
  forwarded: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
  echec: 'Échec',
};

export const artisanStatusMap: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  awaiting_payment: 'En attente de paiement',
  preparing: 'En préparation',
  prete: 'Prête',
  in_delivery: 'En livraison',
  forwarded: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
  echec: 'Échec',
};

export const livreurStatusMap: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'À traiter par les artisans',
  awaiting_payment: null,
  preparing: null,
  prete: 'Prête',
  in_delivery: 'En livraison',
  forwarded: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retour à effectuer',
  echec: 'Échec',
};

export const adminStatusMap: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  awaiting_payment: 'En attente de paiement',
  preparing: 'En préparation',
  prete: 'Prête',
  in_delivery: 'En livraison',
  forwarded: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
  echec: 'Échec',
};

// ====== MAPPING COLIS ======

export const colisStatusMap: Record<ColisStatus, string> = {
  preparing: 'En préparation',
  deposited: 'Déposé au hub',
  dispatched: 'Expédié',
  collected: 'Collecté',
};

/**
 * Retourne l'action affichée pour un colis selon son mode et son statut.
 * Exemples :
 *   mode=depot  + status=preparing  → "À déposer au hub"
 *   mode=envoi  + status=preparing  → "À envoyer via coopérative"
 *   mode=depot  + status=deposited  → "Déposé au hub"
 *   mode=envoi  + status=dispatched → "Expédié"
 */
export function getColisAction(colis: { mode?: string; statut: string }): string {
  if (colis.statut === 'preparing' && colis.mode === 'depot') return 'À déposer au hub';
  if (colis.statut === 'preparing' && colis.mode === 'envoi') return 'À envoyer via coopérative';
  if (colis.statut === 'deposited') return 'Déposé au hub';
  if (colis.statut === 'dispatched') return 'Expédié';
  if (colis.statut === 'collected') return 'Collecté';
  return colisStatusMap[colis.statut as ColisStatus] || colis.statut;
}

// ====== FONCTIONS DE TRADUCTION ======

export function getTranslatedStatus(status: string, role: 'client' | 'artisan' | 'livreur' | 'admin'): string {
  const statusMap = {
    client: clientStatusMap,
    artisan: artisanStatusMap,
    livreur: livreurStatusMap,
    admin: adminStatusMap,
  }[role];

  return statusMap[status as OrderStatus] || status;
}

// ====== VALIDATION DE TRANSITIONS ======

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['awaiting_payment', 'preparing', 'cancelled'],
    awaiting_payment: ['confirmed', 'preparing', 'cancelled'],
    preparing: ['prete', 'cancelled'],
    prete: ['in_delivery', 'forwarded', 'cancelled'],
    forwarded: ['delivered'],
    in_delivery: ['delivered', 'echec'],
    delivered: ['returned'],
    cancelled: [],
    returned: [],
    echec: ['pending', 'cancelled'],
  };

  return validTransitions[from]?.includes(to) || false;
}

// ====== LOGIQUE MÉTIER ======

export function requiresPayment(status: OrderStatus): boolean {
  return status === 'awaiting_payment';
}

export function isDeliveryActive(status: OrderStatus): boolean {
  const activeStatuses: OrderStatus[] = ['in_delivery', 'forwarded'];
  return activeStatuses.includes(status);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  const terminalStatuses: OrderStatus[] = ['delivered', 'cancelled', 'returned', 'echec'];
  return terminalStatuses.includes(status);
}

// ====== UTILITAIRE ======

export function normalizeStatus(status?: string | null): OrderStatus {
  if (!status) return 'pending'
  const normalized = status.toLowerCase()
    .replace(/[-\s]/g, '_')
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/à/g, 'a');

  const legacyMapping: Record<string, OrderStatus> = {
    'en_attente': 'pending',
    'confirmee': 'confirmed',
    'en_preparation': 'preparing',
    'en_livraison': 'in_delivery',
    'livree': 'delivered',
    'annulee': 'cancelled',
    'en_cours': 'preparing',
    'prete': 'prete',
  };

  return legacyMapping[normalized] || normalized as OrderStatus;
}

export function isValidStatus(status: string): status is OrderStatus {
  const normalized = normalizeStatus(status);
  return Object.keys(clientStatusMap).includes(normalized);
}
