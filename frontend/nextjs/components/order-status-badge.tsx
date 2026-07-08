// @ts-nocheck
import { getStatusStyle } from "@/lib/statusStyles"

interface OrderStatusBadgeProps {
  status: string // Allow any string status
  role?: 'client' | 'artisan' | 'livreur' | 'admin' // Optional role for context-aware display
}

export function OrderStatusBadge({ status, role = 'client' }: OrderStatusBadgeProps) {
  const style = getStatusStyle(status, role);
  
  // Si le statut est null pour le livreur, ne pas afficher le badge
  if (!style.label) return null;
  
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${style.color}`} />
      <span className="text-base font-semibold text-gray-900">{style.label}</span>
    </div>
  );
}

