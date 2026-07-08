// @ts-nocheck
/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// Change this to your Django backend URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

/** Origine du serveur Django (sans le suffixe `/api`), utile pour `/media/...` */
export const API_ORIGIN = API_BASE_URL.replace(/\/?api\/?$/i, "")

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/token/`,
    REGISTER: `${API_BASE_URL}/utilisateurs/`,
    REFRESH: `${API_BASE_URL}/auth/token/refresh/`,

  },

  // Profile endpoints
  PROFILE: {
    GET: `${API_BASE_URL}/profile/`,
    UPDATE: `${API_BASE_URL}/profile/update/`,
    AVATAR_UPLOAD: `${API_BASE_URL}/profile/avatar-upload/`,
    CHANGE_PASSWORD: `${API_BASE_URL}/profile/change-password/`,
  },

  // Orders endpoints (backend uses /validations/ for ValidationViewSet)
  ORDERS: {
    LIST: `${API_BASE_URL}/validations/`,
    GET: `${API_BASE_URL}/validations/:id/`,
    UPDATE_STATUS: `${API_BASE_URL}/validations/:id/`,
    CREATE: `${API_BASE_URL}/validations/`,
    ADMIN_CONFIRM_PAYMENT: (id: string) => `${API_BASE_URL}/validations/${id}/admin-confirm-payment/`,
    ADMIN_REQUEST_PAYMENT: (id: string) => `${API_BASE_URL}/validations/${id}/admin-request-payment/`,
    ADMIN_VALIDATE_COD: (id: string) => `${API_BASE_URL}/validations/${id}/admin-validate-cod/`,
    ARTISAN_FULFILLMENT: (id: string) => `${API_BASE_URL}/validations/${id}/artisan-fulfillment/`,
    ARTISAN_EXPEDITION: (id: string) => `${API_BASE_URL}/validations/${id}/artisan-expedition/`,
    SELECT_MODE: (id: string) => `${API_BASE_URL}/validations/${id}/select-mode/`,
    LIVREUR_COLLECT: (id: string) => `${API_BASE_URL}/validations/${id}/livreur-collect/`,
    LIVREUR_START: (id: string) => `${API_BASE_URL}/validations/${id}/livreur-start/`,
    LIVREUR_COMPLETE: (id: string) => `${API_BASE_URL}/validations/${id}/livreur-complete/`,
    LIVREUR_FORWARD: (id: string) => `${API_BASE_URL}/validations/${id}/livreur-forward/`,
    NOTIFY_PAYMENT: (id: string) => `${API_BASE_URL}/validations/${id}/notify-payment/`,
    REJECT_PAYMENT: (id: string) => `${API_BASE_URL}/validations/${id}/reject-payment/`,
  },

  // Reviews endpoints
  REVIEWS: {
    // backend currently uses French "avis" path
    LIST: `${API_BASE_URL}/avis/`,
    CREATE: `${API_BASE_URL}/avis/`,
    UPDATE: `${API_BASE_URL}/avis/:id/`,
    DELETE: `${API_BASE_URL}/avis/:id/`,
  },

  // Categories endpoints
  CATEGORIES: {
    LIST: `${API_BASE_URL}/categories/`,
    GET: `${API_BASE_URL}/categories/:id/`,
    CREATE: `${API_BASE_URL}/categories/`,
    UPDATE: `${API_BASE_URL}/categories/:id/`,
    DELETE: `${API_BASE_URL}/categories/:id/`,
  },

  // Products endpoints
  PRODUCTS: {
    LIST: `${API_BASE_URL}/produits/`,
    GET: `${API_BASE_URL}/produits/:id/`,
    CREATE: `${API_BASE_URL}/produits/`,
    UPDATE: `${API_BASE_URL}/produits/:id/`,
    DELETE: `${API_BASE_URL}/produits/:id/`,
  },

  // QR Code endpoints
  QR_CODE: {
    GENERATE: `${API_BASE_URL}/qr-code/generate/`,
    GET: `${API_BASE_URL}/qr-code/`,
    DOWNLOAD: `${API_BASE_URL}/qr-code/download/`,
  },

  // Cart endpoints
  CART: {
    GET: `${API_BASE_URL}/cart/`,
    ADD_ITEM: `${API_BASE_URL}/cart/items/`,
    REMOVE_ITEM: `${API_BASE_URL}/cart/items/:id/`,
    UPDATE_ITEM: `${API_BASE_URL}/cart/items/:id/`,
    CLEAR: `${API_BASE_URL}/cart/clear/`,
  },

  // Sales endpoints
  SALES: {
    LIST: `${API_BASE_URL}/sales/`,
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications/`,
  },

  // Payments / checkout finalization (commandes app, mounted under /api/)
  PAYMENTS: {
    FINALIZE: `${API_BASE_URL}/finalize-payment/`,
    FINALIZE_DETAIL: (factureId: number | string) =>
      `${API_BASE_URL}/finalize-payment/${factureId}/`,
  },

  // Users/Clients/Artisans endpoints
  USERS: {
    LIST: `${API_BASE_URL}/utilisateurs/`,
    CLIENTS: `${API_BASE_URL}/utilisateurs/?role=client`,
    ARTISANS: `${API_BASE_URL}/utilisateurs/?role=artisan`,
    MANAGERS: `${API_BASE_URL}/utilisateurs/?role=manager`,
    LIVREURS: `${API_BASE_URL}/utilisateurs/?role=livreur`,
    GET: `${API_BASE_URL}/utilisateurs/:id/`,
    UPDATE: `${API_BASE_URL}/utilisateurs/:id/`,
  },

  // Hubs and delivery zones (livraisons app)
  HUBS: {
    LIST: `${API_BASE_URL}/hubs/`,
    GET: `${API_BASE_URL}/hubs/:id/`,
    CREATE: `${API_BASE_URL}/hubs/`,
    UPDATE: `${API_BASE_URL}/hubs/:id/`,
    DELETE: `${API_BASE_URL}/hubs/:id/`,
  },
  ZONES_LIVRAISON: {
    LIST: `${API_BASE_URL}/zones-livraison/`,
    GET: `${API_BASE_URL}/zones-livraison/:id/`,
    CREATE: `${API_BASE_URL}/zones-livraison/`,
    UPDATE: `${API_BASE_URL}/zones-livraison/:id/`,
    DELETE: `${API_BASE_URL}/zones-livraison/:id/`,
  },
  FACTURES: {
    LIST: `${API_BASE_URL}/factures/`,
    BY_VALIDATION: (validationId: number) =>
      `${API_BASE_URL}/factures/?id_validation=${validationId}`,
  },

  COLIS: {
    LIST: `${API_BASE_URL}/colis/`,
    DETAIL: (id: number) => `${API_BASE_URL}/colis/${id}/`,
    DISPATCH: (id: number) => `${API_BASE_URL}/colis/${id}/dispatcher/`,
    COLLECT: (id: number) => `${API_BASE_URL}/colis/${id}/collect/`,
    TO_COLLECT: `${API_BASE_URL}/colis/to_collect/`,
  },

  REVERSEMENTS: {
    LIST: `${API_BASE_URL}/reversements/`,
    SOLDE: `${API_BASE_URL}/reversements/solde/`,
  },

  DEMANDES_PAIEMENT: {
    LIST: `${API_BASE_URL}/demandes-paiement/`,
    CREER: `${API_BASE_URL}/demandes-paiement/`,
    PAYER: (id: number) => `${API_BASE_URL}/demandes-paiement/${id}/payer/`,
    REJETER: (id: number) => `${API_BASE_URL}/demandes-paiement/${id}/rejeter/`,
  },
}

export const API_CONFIG = {
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
}

// Helper function to get auth token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken")
  }
  return null
}

// Helper function to set auth token
export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", token)
  }
}

// Helper function to remove auth token
export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken")
  }
}

// Helper function to get refresh token
export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken")
  }
  return null
}

// Helper function to set refresh token
export const setRefreshToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("refreshToken", token)
  }
}

// Helper function to remove refresh token
export const removeRefreshToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("refreshToken")
  }
}

