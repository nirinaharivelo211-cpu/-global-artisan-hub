// @ts-nocheck
/**
 * API Client
 * Handles all API communication with Django backend
 * Easily extensible for development
 */

import { API_ENDPOINTS, API_CONFIG, getAuthToken, getRefreshToken, setAuthToken, setRefreshToken } from "./api-config"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

interface ApiErrorResponse {
  error?: string
  message?: string
  detail?: string
}

interface Product {
  id: string
  name: string
  image: string
  unitPrice: number
  quantity: number
  artisan: string
}

interface Order {
  id: string
  date: string
  products: Product[]
  shipping: number
  status: string
  deliveryDate?: string
}

// Base fetch function with error handling
let refreshInProgress: Promise<ApiResponse<any>> | null = null

async function apiCall<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    body?: Record<string, any> | FormData
    headers?: Record<string, string>
    isFormData?: boolean
    skipAuth?: boolean
    isRetry?: boolean
  }
): Promise<ApiResponse<T>> {
  try {
    const token = getAuthToken()
    const headers: Record<string, string> = {
      ...API_CONFIG.headers,
      ...(options?.headers || {}),
    }

    // Add auth token if available and not explicitly skipped
    if (token && !options?.skipAuth) {
      headers["Authorization"] = `Bearer ${token}`
    }

    // Don't set Content-Type for FormData, browser will set it
    if (options?.isFormData) {
      delete headers["Content-Type"]
    }

    const response = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body:
        options?.body instanceof FormData
          ? options.body
          : options?.body
            ? JSON.stringify(options.body)
            : undefined,
      signal: AbortSignal.timeout(API_CONFIG.timeout),
      // Prevent caching for GET requests to ensure fresh data
      cache: options?.method === "GET" ? "no-store" : undefined,
    })

    if (!response.ok) {
      const responseText = await response.text()

      let errorData: any
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        console.warn(`API Warning - Could not parse JSON response for ${endpoint}:`, responseText)
        errorData = { error: 'Invalid JSON response', raw: responseText }
      }

      // 401 with invalid/expired token -> refresh token flow
      if (response.status === 401 && !options?.isRetry && !options?.skipAuth) {
        const tokenErrorCode = (errorData as any)?.code
        const tokenErrorMessage = (errorData as any)?.messages?.[0]?.message || (errorData as any)?.detail

        const isTokenInvalid =
          tokenErrorCode === "token_not_valid" ||
          /token_not_valid/i.test(tokenErrorCode || "") ||
          /\bexpired\b|\binvalid\b/i.test(String(tokenErrorMessage || ""))

        if (isTokenInvalid) {
          if (!refreshInProgress) {
            refreshInProgress = refreshAccessToken().finally(() => {
              refreshInProgress = null
            })
          }

          const refreshResult = await refreshInProgress

          if (refreshResult?.success) {
            // Retry the original request with the new token
            return apiCall(endpoint, {
              ...options,
              isRetry: true,
            })
          }

          // No refresh possible -> clear auth and redirect to login
          clearAuthAndRedirect()
          return {
            success: false,
            error: "Authentication required",
            status: 401,
          }
        }
      }

      // If still not ok after token handling, pick a human-friendly message
      let errorMessage = errorData?.error || errorData?.message || errorData?.detail || "Erreur serveur"

      if (typeof errorData === 'object' && !('error' in errorData) && !('message' in errorData) && !('detail' in errorData)) {
        const messages = Object.values(errorData)
          .flat()
          .filter((msg) => typeof msg === 'string')

        if (messages.length > 0) {
          errorMessage = messages.join(', ')
        }
      }

      if (response.status !== 401) {
        console.error(`API Error ${response.status} [${endpoint}]:`, errorData)
      } else {
        console.warn(`API 401 [${endpoint}] -> ${String(errorMessage)}`)
      }

      return {
        success: false,
        error: errorMessage,
        status: response.status,
        data: errorData,
      }
    }

    const data = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur de connexion au serveur"
    return {
      success: false,
      error: errorMessage,
      status: undefined,
    }
  }
}

// Internal helper to clear auth and redirect on invalid/expired token
function clearAuthAndRedirect() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("e-artisan-user")
    // If the URL is already /login, no loop
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login"
    }
  }
}

// Internal function to refresh access token
async function refreshAccessToken() {
  try {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuthAndRedirect()
      return { success: false, error: "No refresh token found" }
    }

    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.access) {
      clearAuthAndRedirect()
      return {
        success: false,
        error: data?.detail || data?.message || "Token refresh failed",
      }
    }

    setAuthToken(data.access)
    // refresh token may rotate in some implementations
    if (data.refresh) {
      setRefreshToken(data.refresh)
    }

    return { success: true, data }
  } catch (error) {
    console.error("Token refresh error:", error)
    clearAuthAndRedirect()
    return { success: false, error: "Token refresh error" }
  }
}

// Auth API Client
export const authApi = {
  async login(data: { email: string; password: string }) {
    return apiCall<{ access: string; refresh: string; force_password_change?: boolean }>(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      body: data,
    })
  },

  async register(data: { firstName: string; lastName: string; email: string; phone: string; password: string; role: string; region?: string }) {
    const body: Record<string, any> = {
      nom: data.lastName,
      prenom: data.firstName,
      email: data.email,
      telephone: data.phone,
      mdp: data.password,
      role: data.role,
    }
    if (data.region) body.region = data.region
    return apiCall<{ user: any; token: string }>(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body,
      skipAuth: true,
    })
  },

  // Admin creates a new user without logging in as them
  async createUser(data: {
    firstName: string; lastName: string; email: string; phone: string;
    password: string; role: string;
    hub?: number; zone_livraison?: number; zones_livraison?: number[];
    force_password_change?: boolean;
  }) {
    return apiCall<{ user: any }>(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body: {
        nom: data.lastName,
        prenom: data.firstName,
        email: data.email,
        telephone: data.phone,
        mdp: data.password,
        role: data.role,
        hub: data.hub,
        zone_livraison: data.zone_livraison,
        zones_livraison: data.zones_livraison,
        force_password_change: data.force_password_change,
      },
    })
  },

  async logout() {
    // JWT logout is client-side: simply remove tokens from localStorage
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
    return { success: true }
  },

  async refreshToken() {
    try {
      const refresh = localStorage.getItem("refreshToken")
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        signal: AbortSignal.timeout(API_CONFIG.timeout),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.error || data.message || "Erreur lors du refresh",
        }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erreur de connexion" }
    }
  },
}

// Profile API Client
export const profileApi = {
  async fetchProfile() {
    return apiCall(API_ENDPOINTS.PROFILE.GET)
  },

  async updateProfile(data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.PROFILE.UPDATE, {
      method: "PUT",
      body: data,
    })
  },

  async uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append("avatar", file)
    return apiCall(API_ENDPOINTS.PROFILE.AVATAR_UPLOAD, {
      method: "POST",
      body: formData,
      isFormData: true,
    })
  },

  async changePassword(oldPassword: string, newPassword: string, confirmPassword?: string) {
    return apiCall(API_ENDPOINTS.PROFILE.CHANGE_PASSWORD, {
      method: "POST",
      body: {
        oldPassword,
        newPassword,
        confirmPassword: confirmPassword || newPassword,
      },
    })
  },
}

// Orders API Client
export const ordersApi = {
  async fetchOrders(): Promise<ApiResponse<Order[]>> {
    return apiCall<Order[]>(API_ENDPOINTS.ORDERS.LIST)
  },

  async getOrder(id: string) {
    return apiCall(API_ENDPOINTS.ORDERS.GET.replace(":id", id))
  },

  async getOrderDetails(factureId: number) {
    return apiCall(API_ENDPOINTS.PAYMENTS.FINALIZE_DETAIL(factureId))
  },

  async updateOrderStatus(id: string, status: string) {
    return apiCall(API_ENDPOINTS.ORDERS.UPDATE_STATUS.replace(":id", id), {
      method: "PATCH",
      body: { status },
    })
  },

  /**
   * Generic partial update for an order.  Accepts any writable fields
   * (delivery info, frais_livraison, etc) and forwards them to the backend.
   */
  async updateOrder(id: string, data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.ORDERS.UPDATE_STATUS.replace(":id", id), {
      method: "PATCH",
      body: data,
    })
  },

  async createOrder(data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.ORDERS.CREATE, {
      method: "POST",
      body: data,
    })
  },

  async adminConfirmPayment(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.ADMIN_CONFIRM_PAYMENT(orderId), {
      method: "POST",
    })
  },

  async adminRequestPayment(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.ADMIN_REQUEST_PAYMENT(orderId), {
      method: "POST",
    })
  },

  async adminValidateCOD(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.ADMIN_VALIDATE_COD(orderId), {
      method: "POST",
    })
  },

  async submitArtisanFulfillment(orderId: string, lines: { panier_item_id: number; available_quantity: number }[]) {
    return apiCall(API_ENDPOINTS.ORDERS.ARTISAN_FULFILLMENT(orderId), {
      method: "POST",
      body: { lines },
    })
  },

  async selectMode(orderId: string, mode: string) {
    return apiCall(API_ENDPOINTS.ORDERS.SELECT_MODE(orderId), {
      method: "POST",
      body: { mode },
    })
  },

  async submitArtisanExpedition(orderId: string, form: FormData) {
    return apiCall(API_ENDPOINTS.ORDERS.ARTISAN_EXPEDITION(orderId), {
      method: "POST",
      body: form,
      isFormData: true,
    })
  },

  async notifyPayment(orderId: string, transactionRef: string) {
    return apiCall(API_ENDPOINTS.ORDERS.NOTIFY_PAYMENT(orderId), {
      method: "POST",
      body: { transaction_ref: transactionRef },
    })
  },

  async adminRejectPayment(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.REJECT_PAYMENT(orderId), { method: "POST" })
  },

  async livreurCollect(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.LIVREUR_COLLECT(orderId), { method: "POST" })
  },

  async livreurStart(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.LIVREUR_START(orderId), { method: "POST" })
  },

  async livreurComplete(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.LIVREUR_COMPLETE(orderId), { method: "POST" })
  },
  async livreurForward(orderId: string) {
    return apiCall(API_ENDPOINTS.ORDERS.LIVREUR_FORWARD(orderId), { method: "POST" })
  },
}

export interface Colis {
  id: number
  uuid: string
  qr_code: string | null
  validation: number
  artisan: number
  artisan_nom: string
  artisan_photo_url: string | null
  statut: string
  mode: string
  numero_colis: string
  cooperative_nom: string
  lieu_depart: string
  submitted_at: string | null
  collected_at: string | null
  collected_by: number | null
  items_count: number
  items_weight: number
  item_ids: number[]
  date_creation: string
}

export const colisApi = {
  async list(params?: { validation?: number; artisan?: number; statut?: string }) {
    const qs = new URLSearchParams()
    if (params?.validation) qs.set("validation", String(params.validation))
    if (params?.artisan) qs.set("artisan", String(params.artisan))
    if (params?.statut) qs.set("statut", params.statut)
    const query = qs.toString()
    return apiCall<Colis[]>(`${API_ENDPOINTS.COLIS.LIST}${query ? `?${query}` : ""}`)
  },
  async get(id: number) {
    return apiCall<Colis>(API_ENDPOINTS.COLIS.DETAIL(id))
  },
  async create(data: { validation: number; artisan: number }) {
    return apiCall<Colis>(API_ENDPOINTS.COLIS.LIST, { method: "POST", body: data })
  },
  async dispatcher(id: number, data: { mode: string; numero_colis?: string; cooperative_nom?: string }) {
    return apiCall<Colis>(API_ENDPOINTS.COLIS.DISPATCH(id), { method: "POST", body: data })
  },
  async collect(id: number) {
    return apiCall<Colis>(API_ENDPOINTS.COLIS.COLLECT(id), { method: "POST" })
  },
  async toCollect() {
    return apiCall<Colis[]>(API_ENDPOINTS.COLIS.TO_COLLECT)
  },
}

// Notifications API Client
export const notificationsApi = {
  async fetchNotifications() {
    return apiCall<any[]>(API_ENDPOINTS.NOTIFICATIONS.LIST)
  },

  async getUnreadCount() {
    return apiCall(`${API_ENDPOINTS.NOTIFICATIONS.LIST}unread_count/`)
  },

  async markAsRead(id: number) {
    return apiCall(`${API_ENDPOINTS.NOTIFICATIONS.LIST}${id}/mark_as_read/`, {
      method: "POST",
    })
  },

  async markAllAsRead() {
    return apiCall(`${API_ENDPOINTS.NOTIFICATIONS.LIST}mark_all_as_read/`, {
      method: "POST",
    })
  },

  async deleteNotification(id: number) {
    return apiCall(`${API_ENDPOINTS.NOTIFICATIONS.LIST}${id}/delete_notification/`, {
      method: "DELETE",
    })
  },

  async clearAll() {
    return apiCall(`${API_ENDPOINTS.NOTIFICATIONS.LIST}clear_all/`, {
      method: "DELETE",
    })
  },
}

// Reviews API Client
export const reviewsApi = {
  async fetchReviews() {
    return apiCall(API_ENDPOINTS.REVIEWS.LIST)
  },

  async addReview(data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.REVIEWS.CREATE, {
      method: "POST",
      body: data,
    })
  },

  async updateReview(id: string, data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.REVIEWS.UPDATE.replace(":id", id), {
      method: "PUT",
      body: data,
    })
  },

  async deleteReview(id: string) {
    return apiCall(API_ENDPOINTS.REVIEWS.DELETE.replace(":id", id), {
      method: "DELETE",
    })
  },
}

// Categories API Client
export const categoriesApi = {
  async fetchCategories(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.CATEGORIES.LIST)
  },

  async getCategory(id: string) {
    return apiCall(API_ENDPOINTS.CATEGORIES.GET.replace(":id", id))
  },

  async createCategory(data: Record<string, any> | FormData): Promise<ApiResponse<any>> {
    const isFormData = data instanceof FormData
    return apiCall<any>(API_ENDPOINTS.CATEGORIES.CREATE, {
      method: "POST",
      body: data,
      isFormData,
    })
  },

  async updateCategory(id: string, data: Record<string, any> | FormData) {
    const isFormData = data instanceof FormData
    return apiCall(API_ENDPOINTS.CATEGORIES.UPDATE.replace(":id", id), {
      method: "PUT",
      body: data,
      isFormData,
    })
  },

  async deleteCategory(id: string) {
    return apiCall(API_ENDPOINTS.CATEGORIES.DELETE.replace(":id", id), {
      method: "DELETE",
    })
  },
}

// Products API Client
export const productsApi = {
  async fetchProducts(params?: Record<string, string>): Promise<ApiResponse<any[]>> {
    let url = API_ENDPOINTS.PRODUCTS.LIST
    if (params) {
      const qs = new URLSearchParams(params).toString()
      url += (url.includes("?") ? "&" : "?") + qs
    }
    return apiCall<any[]>(url)
  },

  async getProduct(id: string) {
    return apiCall(API_ENDPOINTS.PRODUCTS.GET.replace(":id", id))
  },

  async createProduct(data: Record<string, any>): Promise<ApiResponse<any>> {
    const isFormData = data instanceof FormData
    return apiCall<any>(API_ENDPOINTS.PRODUCTS.CREATE, {
      method: "POST",
      body: data,
      isFormData,
    })
  },

  async updateProduct(id: string, data: Record<string, any>) {
    const isFormData = data instanceof FormData
    return apiCall(API_ENDPOINTS.PRODUCTS.UPDATE.replace(":id", id), {
      method: "PUT",
      body: data,
      isFormData,
    })
  },

  async patchProduct(id: string, data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.PRODUCTS.UPDATE.replace(":id", id), {
      method: "PATCH",
      body: data,
    })
  },
  async suspendreProduct(id: string, data: { motif: string }) {
    return apiCall(`${API_ENDPOINTS.PRODUCTS.GET.replace(":id", id)}suspendre/`, {
      method: "POST",
      body: data,
    })
  },
  async bannirProduct(id: string, data: { motif: string }) {
    return apiCall(`${API_ENDPOINTS.PRODUCTS.GET.replace(":id", id)}bannir/`, {
      method: "POST",
      body: data,
    })
  },
  async deleteProduct(id: string) {
    return apiCall(API_ENDPOINTS.PRODUCTS.DELETE.replace(":id", id), {
      method: "DELETE",
    })
  },
}

// QR Code API Client
export const qrCodeApi = {
  async generateQRCode() {
    return apiCall(API_ENDPOINTS.QR_CODE.GENERATE, {
      method: "POST",
    })
  },

  async getQRCode() {
    return apiCall(API_ENDPOINTS.QR_CODE.GET)
  },

  async downloadQRCode() {
    return apiCall(API_ENDPOINTS.QR_CODE.DOWNLOAD)
  },
}

// Cart API Client
export const cartApi = {
  async fetchCart() {
    return apiCall(API_ENDPOINTS.CART.GET)
  },

  async addItem(data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.CART.ADD_ITEM, {
      method: "POST",
      body: data,
    })
  },

  async removeItem(id: string) {
    return apiCall(API_ENDPOINTS.CART.REMOVE_ITEM.replace(":id", id), {
      method: "DELETE",
    })
  },

  async updateItem(id: string, data: Record<string, any>) {
    return apiCall(API_ENDPOINTS.CART.UPDATE_ITEM.replace(":id", id), {
      method: "PUT",
      body: data,
    })
  },

  async clearCart() {
    return apiCall(API_ENDPOINTS.CART.CLEAR, {
      method: "POST",
    })
  },
}

export const salesApi = {
  async fetchSales() {
    return apiCall(API_ENDPOINTS.SALES.LIST)
  },
}

// Users API Client
export const usersApi = {
  async fetchClients(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.USERS.CLIENTS)
  },

  async fetchArtisans(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.USERS.ARTISANS)
  },

  async fetchArtisanById(id: string): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.USERS.GET.replace(':id', id))
  },

  async fetchAllUsers(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.USERS.LIST)
  },

  async fetchManagers(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.USERS.MANAGERS)
  },
  async fetchLivreurs(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.USERS.LIVREURS)
  },

  async updateUserStatus(id: string, status: string, role?: string, reason?: string): Promise<ApiResponse<any>> {
    // Include role in the payload because backend serializer may require it on update
    const body: Record<string, any> = { statut: status }
    if (role) body.role = role
    if (reason) body.raison = reason
    return apiCall<any>(API_ENDPOINTS.USERS.UPDATE.replace(":id", id), {
      method: "PATCH",
      body,
    })
  },
  async suspendreUser(id: string, motif: string): Promise<ApiResponse<any>> {
    return apiCall<any>(`${API_ENDPOINTS.USERS.GET.replace(":id", id)}suspendre/`, {
      method: "POST",
      body: { motif },
    })
  },
  async bannirUser(id: string, motif: string): Promise<ApiResponse<any>> {
    return apiCall<any>(`${API_ENDPOINTS.USERS.GET.replace(":id", id)}bannir/`, {
      method: "POST",
      body: { motif },
    })
  },
  async reactiverUser(id: string): Promise<ApiResponse<any>> {
    return apiCall<any>(`${API_ENDPOINTS.USERS.GET.replace(":id", id)}reactiver/`, {
      method: "POST",
    })
  },
}

// Payments API Client
export const paymentsApi = {
  async getOrderDetails(factureId: number) {
    return apiCall(API_ENDPOINTS.PAYMENTS.FINALIZE_DETAIL(factureId))
  },
  
  async finalizePayment(data: {
    facture_id: number
    payment_method: string
    amount_collected: number
    payment_status: string
    notes?: string
    delivery_person_id: number
  }) {
    return apiCall(API_ENDPOINTS.PAYMENTS.FINALIZE, {
      method: 'POST',
      body: data
    })
  }
}

// Hubs API Client
export const hubsApi = {
  async fetchHubs(): Promise<ApiResponse<any[]>> {
    return apiCall<any[]>(API_ENDPOINTS.HUBS.LIST)
  },

  async getHub(id: string): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.HUBS.GET.replace(":id", id))
  },

  async createHub(data: Record<string, any>): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.HUBS.CREATE, {
      method: "POST",
      body: data,
    })
  },

  async updateHub(id: string, data: Record<string, any>): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.HUBS.UPDATE.replace(":id", id), {
      method: "PATCH",
      body: data,
    })
  },

  async deleteHub(id: string): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.HUBS.DELETE.replace(":id", id), {
      method: "DELETE",
    })
  },

  async nearest(region: string, city: string): Promise<ApiResponse<any>> {
    return apiCall<any>(`${API_ENDPOINTS.HUBS.LIST}nearest/?region=${encodeURIComponent(region)}&city=${encodeURIComponent(city)}`)
  },
}

// Delivery Zones API Client
export const zonesApi = {
  async fetchZones(hubId?: string, ville?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams()
    if (hubId) params.set('hub', hubId)
    if (ville) params.set('ville', ville)
    const qs = params.toString()
    const url = API_ENDPOINTS.ZONES_LIVRAISON.LIST + (qs ? `?${qs}` : '')
    return apiCall<any[]>(url)
  },

  async createZone(data: Record<string, any>): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.ZONES_LIVRAISON.CREATE, {
      method: "POST",
      body: data,
    })
  },

  async updateZone(id: string, data: Record<string, any>): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.ZONES_LIVRAISON.UPDATE.replace(":id", id), {
      method: "PATCH",
      body: data,
    })
  },

  async deleteZone(id: string): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.ZONES_LIVRAISON.DELETE.replace(":id", id), {
      method: "DELETE",
    })
  },
}

// Factures API Client
export const facturesApi = {
  async fetchByValidation(validationId: number): Promise<ApiResponse<any>> {
    return apiCall<any>(API_ENDPOINTS.FACTURES.BY_VALIDATION(validationId))
  },
}

// Reversements API Client
export const reversementsApi = {
  async list(params?: { artisan?: number }) {
    const qs = new URLSearchParams()
    if (params?.artisan) qs.set("artisan", String(params.artisan))
    const query = qs.toString()
    return apiCall<any[]>(`${API_ENDPOINTS.REVERSEMENTS.LIST}${query ? `?${query}` : ""}`)
  },
  async solde() {
    return apiCall<{ total_gagne: number; total_paye: number; demandes_en_cours: number; disponible: number }>(
      API_ENDPOINTS.REVERSEMENTS.SOLDE
    )
  },
}

// Demandes Paiement API Client
export const demandesPaiementApi = {
  async list(params?: { statut?: string }) {
    const qs = new URLSearchParams()
    if (params?.statut) qs.set("statut", params.statut)
    const query = qs.toString()
    return apiCall<any[]>(`${API_ENDPOINTS.DEMANDES_PAIEMENT.LIST}${query ? `?${query}` : ""}`)
  },
  async creer(data: number | Record<string, any>) {
    return apiCall<any>(API_ENDPOINTS.DEMANDES_PAIEMENT.CREER, { method: "POST", body: typeof data === "number" ? { montant: data } : data })
  },
  async payer(id: number, data: Record<string, any>) {
    return apiCall<any>(API_ENDPOINTS.DEMANDES_PAIEMENT.PAYER(id), { method: "POST", body: data })
  },
  async rejeter(id: number, data?: Record<string, any>) {
    return apiCall<any>(API_ENDPOINTS.DEMANDES_PAIEMENT.REJETER(id), { method: "POST", body: data || {} })
  },
}

export default apiCall

