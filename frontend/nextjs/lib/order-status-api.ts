/**
 * API pour la gestion des statuts de commande avec workflow
 * Utilise les endpoints sécurisés pour les transitions de statut
 */

import { getAuthToken } from './api-config'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

export interface StatusTransition {
  current_status: string
  allowed_transitions: string[]
  next_status?: string
}

export interface StatusUpdateResponse {
  success: boolean
  error?: string
  data?: any
}

class OrderStatusAPI {
  /**
   * Met à jour le statut d'une commande (Validation)
   */
  async updateValidationStatus(orderId: number, newStatus: string): Promise<StatusUpdateResponse> {
    try {
      const token = getAuthToken()
      if (!token) {
        return { success: false, error: 'Non authentifié' }
      }

      const response = await fetch(`${API_BASE_URL}/validations/${orderId}/update-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || data.detail || 'Erreur lors de la mise à jour du statut' 
        }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur réseau' 
      }
    }
  }

  /**
   * Met à jour le statut d'une livraison
   */
  async updateDeliveryStatus(deliveryId: number, newStatus: string): Promise<StatusUpdateResponse> {
    try {
      const token = getAuthToken()
      if (!token) {
        return { success: false, error: 'Non authentifié' }
      }

      const response = await fetch(`${API_BASE_URL}/livraisons/${deliveryId}/update-status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || data.detail || 'Erreur lors de la mise à jour du statut' 
        }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur réseau' 
      }
    }
  }

  /**
   * Récupère les transitions autorisées pour une commande (Validation)
   */
  async getValidationAllowedTransitions(orderId: number): Promise<StatusTransition | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        return null
      }

      const response = await fetch(`${API_BASE_URL}/validations/${orderId}/allowed-transitions/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur lors de la récupération des transitions:', error)
      return null
    }
  }

  /**
   * Récupère les transitions autorisées pour une livraison
   */
  async getDeliveryAllowedTransitions(deliveryId: number): Promise<StatusTransition | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        return null
      }

      const response = await fetch(`${API_BASE_URL}/livraisons/${deliveryId}/allowed-transitions/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur lors de la récupération des transitions:', error)
      return null
    }
  }

  /**
   * Fonction utilitaire pour mettre à jour le statut avec validation automatique
   */
  async updateStatus(
    orderId: number, 
    newStatus: string, 
    isDelivery: boolean = false
  ): Promise<StatusUpdateResponse> {
    if (isDelivery) {
      return this.updateDeliveryStatus(orderId, newStatus)
    } else {
      return this.updateValidationStatus(orderId, newStatus)
    }
  }

  /**
   * Fonction utilitaire pour récupérer les transitions autorisées
   */
  async getAllowedTransitions(
    orderId: number, 
    isDelivery: boolean = false
  ): Promise<StatusTransition | null> {
    if (isDelivery) {
      return this.getDeliveryAllowedTransitions(orderId)
    } else {
      return this.getValidationAllowedTransitions(orderId)
    }
  }
}

export const orderStatusAPI = new OrderStatusAPI()

/**
 * Fonctions utilitaires pour le workflow
 */

/**
 * Vérifie si une transition est autorisée
 */
export function isTransitionAllowed(
  currentStatus: string, 
  newStatus: string, 
  allowedTransitions: string[]
): boolean {
  return allowedTransitions.includes(newStatus)
}

/**
 * Obtient le prochain statut logique
 */
export function getNextStatus(allowedTransitions: StatusTransition): string | null {
  return allowedTransitions.next_status || null
}

/**
 * Détermine si une action est disponible selon le statut actuel
 */
export function getAvailableActions(currentStatus: string): {
  canCancel: boolean
  canReturn: boolean
  canProgress: boolean
  nextStatus?: string
} {
  const canCancel = ['pending', 'confirmed', 'awaiting_payment', 'preparing'].includes(currentStatus)
  const canReturn = ['in_delivery', 'delivered'].includes(currentStatus)
  const canProgress = !['delivered', 'cancelled', 'returned'].includes(currentStatus)

  return {
    canCancel,
    canReturn,
    canProgress
  }
}

/**
 * Labels d'affichage pour les statuts
 */
export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  awaiting_payment: 'En attente de paiement',
  preparing: 'En préparation',
  to_deposit: 'À déposer',
  deposited: 'Déposée',
  collected: 'Collectée',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée'
}

/**
 * Couleurs pour les statuts
 */
export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  awaiting_payment: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-purple-100 text-purple-800',
  to_deposit: 'bg-indigo-100 text-indigo-800',
  deposited: 'bg-cyan-100 text-cyan-800',
  collected: 'bg-teal-100 text-teal-800',
  in_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-gray-100 text-gray-800'
}

/**
 * Fonction pour obtenir le label et la couleur d'un statut
 */
export function getStatusDisplay(status: string): {
  label: string
  color: string
} {
  return {
    label: STATUS_LABELS[status] || status,
    color: STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  }
}
