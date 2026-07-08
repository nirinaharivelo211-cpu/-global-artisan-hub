// @ts-nocheck
import { API_BASE_URL, getAuthToken } from './api-config'

export interface Product {
  id: number
  name: string
  quantity: number
  price: string
  image?: string
  variation_id?: number
  variation_color?: string
  variation_color_name?: string
  variation_size?: string
  artisan?: string
}

export interface Delivery {
  id: number
  id_validation: number
  orderNumber: string
  clientName: string
  clientEmail?: string
  clientPhoto?: string
  clientPhone: string
  address: string
  products: Product[]
  amount: number
  montant_total?: number
  frais_livraison?: number
  status: string
  statut_display: string
  date_creation?: string
  date_prevue: string
  date_reelle?: string
  montant_du: number
  montant_encaisse?: number
  mode_paiement?: string
  statut_paiement?: string
  commentaire_livraison?: string
  datePrevue?: string
  dateReelle?: string
  qr_code?: string
  id_utilisateur?: any
  livreur_nom?: string
  mode_paiement_display?: string
  statut_paiement_display?: string
  commentaires?: string
  hub_destination_nom?: string
  zone_livraison_nom?: string
  cooperative_nom?: string
  cooperative_numero_suivi?: string
  shipped_at?: string
  expedition_mode?: string
  expedition_numero_colis?: string
  expedition_photo?: string
}

export interface GroupedDeliveries {
  to_collect: Delivery[]
  in_delivery: Delivery[]
  delivered: Delivery[]
  failed: Delivery[]
}

export interface ZoneInfo {
  id: number
  nom: string
  hub_nom: string | null
}

export interface DeliveryStats {
  assigned_today: number
  completed_this_month: number
  total_collected_this_month: number
  success_rate: number
  to_collect_count: number
  in_delivery_count: number
  quota_quotidien: number
  charge_aujourdhui: number
  zones: ZoneInfo[]
}

function normalizeDelivery(d: any): Delivery {
  if (!d) return d
  return { ...d, status: d.statut_validation || d.status || "" }
}

class DeliveriesAPI {
  async getMyDeliveries(): Promise<Delivery[]> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return []
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/assigned_to_me/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        console.error('Failed to fetch deliveries:', response.statusText)
        return []
      }

      const data = await response.json()
      return (data || []).map(normalizeDelivery)
    } catch (error) {
      console.error('Error fetching deliveries:', error)
      return []
    }
  }

  async getDeliveryById(id: number): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return null
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/${id}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch delivery:', response.statusText)
        return null
      }

      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error fetching delivery:', error)
      return null
    }
  }

  async getStats(): Promise<DeliveryStats | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return null
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/stats/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch stats:', response.statusText)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching stats:', error)
      return null
    }
  }

  async startDelivery(id: number, data?: { cooperative_nom?: string; cooperative_numero_suivi?: string }): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return null
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/${id}/start_delivery/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        console.error('Failed to start delivery:', response.statusText)
        return null
      }

      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error starting delivery:', error)
      return null
    }
  }

  async sauvegarderExpedition(id: number, data: {
    cooperative_nom: string;
    cooperative_numero_suivi?: string;
    shipped_at: string;
  }): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return null
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/${id}/sauvegarder_expedition/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        console.error('Failed to save expedition:', err?.detail || response.statusText)
        return null
      }

      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error saving expedition:', error)
      return null
    }
  }

  async finalizeDelivery(
    id: number,
    montant_encaisse: number,
    mode_paiement: string,
    statut_paiement: string,
    commentaires: string = ''
  ): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return null
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/${id}/finalize_delivery/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          montant_encaisse,
          mode_paiement,
          statut_paiement,
          commentaires,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to finalize delivery:', error)
        return null
      }

      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error finalizing delivery:', error)
      return null
    }
  }

  async failDelivery(
    id: number,
    raison: string,
    commentaires: string = ''
  ): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No authentication token found')
        return null
      }
      const response = await fetch(`${API_BASE_URL}/livraisons/${id}/fail_delivery/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          raison,
          commentaires,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to report delivery problem:', error)
        return null
      }

      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error reporting delivery problem:', error)
      return null
    }
  }

  async getGroupedByStatus(): Promise<GroupedDeliveries | null> {
    try {
      const token = getAuthToken()
      if (!token) return null
      const response = await fetch(`${API_BASE_URL}/livraisons/grouped_by_status/`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) return null
      const data = await response.json()
      if (!data) return null
      return {
        to_collect: (data.to_collect || []).map(normalizeDelivery),
        in_delivery: (data.in_delivery || []).map(normalizeDelivery),
        delivered: (data.delivered || []).map(normalizeDelivery),
        failed: (data.failed || []).map(normalizeDelivery),
      }
    } catch (error) {
      console.error('Error fetching grouped deliveries:', error)
      return null
    }
  }

  async reassignDelivery(id: number, newLivreurId: number): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) return null
      const response = await fetch(`${API_BASE_URL}/livraisons/${id}/reassign/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id_utilisateur: newLivreurId }),
      })
      if (!response.ok) return null
      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error reassigning delivery:', error)
      return null
    }
  }

  async lookupByScan(code: string): Promise<Delivery | null> {
    try {
      const token = getAuthToken()
      if (!token) return null
      const response = await fetch(`${API_BASE_URL}/livraisons/lookup_by_scan/?code=${encodeURIComponent(code)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) return null
      return normalizeDelivery(await response.json())
    } catch (error) {
      console.error('Error looking up delivery by scan:', error)
      return null
    }
  }
}

export const deliveriesApi = new DeliveriesAPI()

