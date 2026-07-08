export const ROLE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-800",
  artisan: "bg-amber-100 text-amber-800",
  manager: "bg-purple-100 text-purple-800",
  livreur: "bg-cyan-100 text-cyan-800",
  admin: "bg-red-100 text-red-800",
}

export const STATUS_COLORS: Record<string, string> = {
  actif: "bg-green-100 text-green-800",
  inactif: "bg-gray-100 text-gray-800",
  suspendu: "bg-orange-100 text-orange-800",
  banni: "bg-red-100 text-red-800",
  "en attente": "bg-yellow-100 text-yellow-800",
}

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] || "bg-gray-100 text-gray-800"
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] || "bg-gray-100 text-gray-800"
}
