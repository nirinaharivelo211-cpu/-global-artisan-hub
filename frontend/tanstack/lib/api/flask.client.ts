import { getServerConfig } from "../config.server";
import type {
  FlaskUser, FlaskProduct, FlaskOrder, FlaskCategory,
  FlaskHub, FlaskZoneLivraison, FlaskNotification, FlaskTransaction,
  LoginResponse, RegisterResponse,
} from "../types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("flask_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }

  return res.json();
}

// ---- Auth ----
export const flaskAuth = {
  login: (email: string, password: string) =>
    request<LoginResponse>("POST", "/auth/login", { email, password }),

  register: (data: { email: string; password: string; nom: string; prenom: string; role?: string }) =>
    request<RegisterResponse>("POST", "/auth/register", data),

  me: () => request<FlaskUser>("GET", "/auth/me"),
};

// ---- Produits ----
export const flaskProduits = {
  list: (params?: { page?: number; categorie?: string; artisan?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.categorie) q.set("categorie", params.categorie);
    if (params?.artisan) q.set("artisan", params.artisan);
    if (params?.search) q.set("search", params.search);
    return request<{ produits: FlaskProduct[]; total: number; page: number; pages: number }>("GET", `/produits?${q}`);
  },

  get: (id: string) => request<FlaskProduct>("GET", `/produits/${id}`),

  create: (data: { nom: string; prix: number; id_categorie: string; description?: string; poids?: number; image?: string }) =>
    request<FlaskProduct>("POST", "/produits", data),

  update: (id: string, data: Partial<FlaskProduct>) =>
    request<FlaskProduct>("PUT", `/produits/${id}`, data),

  categories: () => request<FlaskCategory[]>("GET", "/produits/categories"),
};

// ---- Commandes ----
export const flaskCommandes = {
  orders: (params?: { page?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.status) q.set("status", params.status);
    return request<{ orders: FlaskOrder[]; total: number; page: number; pages: number }>("GET", `/commandes/orders?${q}`);
  },

  getOrder: (id: string) => request<FlaskOrder>("GET", `/commandes/orders/${id}`),

  checkout: (data: { address: string; city: string; region?: string; payment_method?: string; frais_livraison?: number; notes?: string }) =>
    request<{ order_id: string; montant_total: string; status: string }>("POST", "/commandes/checkout", data),

  updateStatus: (orderId: string, status: string) =>
    request<{ message: string; status: string }>("PATCH", `/commandes/orders/${orderId}/status`, { status }),
};

// ---- Livraison ----
export const flaskLivraison = {
  hubs: () => request<FlaskHub[]>("GET", "/livraisons/hubs"),
  zones: (hubId?: string) => {
    const q = hubId ? `?hub_id=${hubId}` : "";
    return request<FlaskZoneLivraison[]>("GET", `/livraisons/zones${q}`);
  },
};

// ---- Notifications ----
export const flaskNotifications = {
  list: (params?: { page?: number; unread_only?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.unread_only) q.set("unread_only", "true");
    return request<{ notifications: FlaskNotification[]; total: number; unread_count: number }>("GET", `/notifications?${q}`);
  },
  markRead: (id: string) => request<{ message: string }>("PATCH", `/notifications/${id}/read`),
  markAllRead: () => request<{ message: string }>("PATCH", "/notifications/read-all"),
};

// ---- Paiements ----
export const flaskPaiements = {
  transactions: (params?: { page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    return request<{ transactions: FlaskTransaction[]; total: number }>("GET", `/paiements/transactions?${q}`);
  },
};

// ---- Utilisateurs ----
export const flaskUtilisateurs = {
  artisans: () => request<FlaskUser[]>("GET", "/utilisateurs/artisans"),
  update: (userId: string, data: Record<string, unknown>) =>
    request<{ message: string }>("PUT", `/utilisateurs/${userId}`, data),
};
