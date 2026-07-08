// 🎨 STYLES DES BADGES DE STATUTS - COHÉRENTS AVEC LE DESIGN EXISTANT

import type { OrderStatus } from './statusMapping';

// ====== DÉFINITIONS DES TYPES ======

export type StatusStyle = {
  label: string;
  color: string;        // Couleur du dot/cercle
  bgColor: string;      // Fond du badge
  textColor: string;    // Texte du badge
};

export type UserRole = 'client' | 'artisan' | 'livreur' | 'admin';

// ====== CONFIGURATION DES COULEURS ======
// Basé sur le design existant dans order-detail-shared.tsx

// Couleurs selon les spécifications
export const statusColors: Record<OrderStatus, StatusStyle> = {
  pending: {
    label: "En attente",
    color: "bg-gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700"
  },
  confirmed: {
    label: "Confirmée",
    color: "bg-blue-500", 
    bgColor: "bg-blue-100",
    textColor: "text-blue-700"
  },
  awaiting_payment: {
    label: "En attente de paiement",
    color: "bg-orange-500",
    bgColor: "bg-orange-100", 
    textColor: "text-orange-700"
  },
  preparing: {
    label: "En préparation",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700"
  },
  prete: {
    label: "Prête",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700"
  },
  forwarded: {
    label: "Expédiée",
    color: "bg-cyan-500",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-700"
  },
  in_delivery: {
    label: "En livraison",
    color: "bg-orange-500",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700"
  },
  delivered: {
    label: "Livrée",
    color: "bg-green-500",
    bgColor: "bg-green-100",
    textColor: "text-green-700"
  },
  cancelled: {
    label: "Annulée",
    color: "bg-red-500",
    bgColor: "bg-red-100",
    textColor: "text-red-700"
  },
  returned: {
    label: "Retournée",
    color: "bg-gray-500",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700"
  },
  echec: {
    label: "Échec",
    color: "bg-red-500",
    bgColor: "bg-red-100",
    textColor: "text-red-700"
  }
};

// ====== FONCTION PRINCIPALE ======

/**
 * Obtenir le style du statut selon le rôle et le statut
 * @param status - Statut de la commande
 * @param role - Rôle de l'utilisateur
 * @returns Style complet du statut
 */
export function getStatusStyle(status: string, role: UserRole): StatusStyle {
  const { normalizeStatus, getTranslatedStatus } = require('./statusMapping');
  
  // Normaliser le statut
  const normalizedStatus = normalizeStatus(status);
  
  // Obtenir le label traduit selon le rôle
  const translatedLabel = getTranslatedStatus(normalizedStatus, role);
  
  // Obtenir les couleurs de base
  const baseStyle = statusColors[normalizedStatus] || statusColors.pending;
  
  // Retourner le style complet avec le label traduit
  return {
    ...baseStyle,
    label: translatedLabel
  };
}

// ====== UTILITAIRES DE BADGES ======

/**
 * Obtenir les classes CSS pour un badge simple avec dot
 */
export function getStatusBadgeClasses(status: string, role: UserRole) {
  const style = getStatusStyle(status, role);
  return {
    container: "flex items-center gap-2",
    dot: `h-2.5 w-2.5 rounded-full ${style.color}`,
    text: `text-base font-semibold text-gray-900`,
    label: style.label
  };
}

/**
 * Obtenir les classes CSS pour un badge complet avec fond
 */
export function getStatusBadgeFullClasses(status: string, role: UserRole) {
  const style = getStatusStyle(status, role);
  return {
    container: `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${style.bgColor} ${style.textColor}`,
    dot: `h-2 w-2 rounded-full ${style.color}`,
    label: style.label
  };
}

/**
 * Obtenir les classes CSS pour un badge compact
 */
export function getStatusBadgeCompactClasses(status: string, role: UserRole) {
  const style = getStatusStyle(status, role);
  return {
    container: `inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${style.bgColor} ${style.textColor}`,
    label: style.label
  };
}

// ====== UTILITAIRES ======

/**
 * Obtenir uniquement la couleur du dot
 */
export function getStatusDotColor(status: string): string {
  const { normalizeStatus } = require('./statusMapping');
  const normalizedStatus = normalizeStatus(status);
  return statusColors[normalizedStatus]?.color || statusColors.pending.color;
}

/**
 * Obtenir uniquement le label traduit
 */
export function getStatusLabel(status: string, role: UserRole): string {
  const { getTranslatedStatus } = require('./statusMapping');
  return getTranslatedStatus(status, role);
}

export function isTerminalStatus(status: string): boolean {
  const { normalizeStatus, isTerminalStatus: check } = require('./statusMapping');
  return check(normalizeStatus(status));
}

export function isDeliveryActive(status: string): boolean {
  const { normalizeStatus, isDeliveryActive: check } = require('./statusMapping');
  return check(normalizeStatus(status));
}
