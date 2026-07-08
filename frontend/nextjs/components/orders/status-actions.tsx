/**
 * Composant pour les actions de statut de commande avec workflow
 * Utilise l'API sécurisée pour les transitions de statut
 */

'use client'

import React, { useState } from 'react'
import { orderStatusAPI, isTransitionAllowed, getAvailableActions, getStatusDisplay } from '@/lib/order-status-api'

interface StatusActionsProps {
  orderId: number
  currentStatus: string
  isDelivery?: boolean
  onStatusUpdate?: (newStatus: string) => void
  disabled?: boolean
  className?: string
}

export function StatusActions({ 
  orderId, 
  currentStatus, 
  isDelivery = false, 
  onStatusUpdate,
  disabled = false,
  className = ''
}: StatusActionsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([])
  const [nextStatus, setNextStatus] = useState<string | null>(null)

  // Charger les transitions autorisées au montage du composant
  React.useEffect(() => {
    loadAllowedTransitions()
  }, [orderId, currentStatus, isDelivery])

  const loadAllowedTransitions = async () => {
    try {
      const transitions = await orderStatusAPI.getAllowedTransitions(orderId, isDelivery)
      if (transitions) {
        setAllowedTransitions(transitions.allowed_transitions)
        setNextStatus(transitions.next_status)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des transitions:', err)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (disabled || loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await orderStatusAPI.updateStatus(orderId, newStatus, isDelivery)
      
      if (response.success) {
        // Mettre à jour les transitions disponibles
        await loadAllowedTransitions()
        
        // Notifier le parent du changement
        if (onStatusUpdate) {
          onStatusUpdate(newStatus)
        }
      } else {
        setError(response.error || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const actions = getAvailableActions(currentStatus)
  const statusDisplay = getStatusDisplay(currentStatus)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Statut actuel */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Statut actuel:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
          {statusDisplay.label}
        </span>
      </div>

      {/* Actions disponibles */}
      <div className="space-y-2">
        {actions.canProgress && nextStatus && (
          <button
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={disabled || loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Chargement...' : `Passer à: ${getStatusDisplay(nextStatus).label}`}
          </button>
        )}

        {actions.canCancel && (
          <button
            onClick={() => handleStatusUpdate('cancelled')}
            disabled={disabled || loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Chargement...' : 'Annuler la commande'}
          </button>
        )}

        {actions.canReturn && (
          <button
            onClick={() => handleStatusUpdate('returned')}
            disabled={disabled || loading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Chargement...' : 'Retourner la commande'}
          </button>
        )}
      </div>

      {/* Transitions personnalisées */}
      {allowedTransitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Autres actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {allowedTransitions
              .filter(status => status !== nextStatus && !['cancelled', 'returned'].includes(status))
              .map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={disabled || loading}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {loading ? '...' : getStatusDisplay(status).label}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Informations de workflow */}
      <div className="text-xs text-gray-500">
        <p>Transitions autorisées: {allowedTransitions.length}</p>
        {nextStatus && <p>Prochain statut: {getStatusDisplay(nextStatus).label}</p>}
      </div>
    </div>
  )
}

/**
 * Composant simplifié pour les actions rapides
 */
export function QuickStatusActions({ 
  orderId, 
  currentStatus, 
  isDelivery = false, 
  onStatusUpdate 
}: Omit<StatusActionsProps, 'className' | 'disabled'>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actions = getAvailableActions(currentStatus)
  const statusDisplay = getStatusDisplay(currentStatus)

  const handleQuickAction = async (action: 'progress' | 'cancel' | 'return') => {
    setLoading(true)
    setError(null)

    try {
      let newStatus: string
      switch (action) {
        case 'progress':
          // Récupérer le prochain statut automatiquement
          const transitions = await orderStatusAPI.getAllowedTransitions(orderId, isDelivery)
          if (!transitions?.next_status) {
            setError('Aucune progression disponible')
            return
          }
          newStatus = transitions.next_status
          break
        case 'cancel':
          newStatus = 'cancelled'
          break
        case 'return':
          newStatus = 'returned'
          break
        default:
          return
      }

      const response = await orderStatusAPI.updateStatus(orderId, newStatus, isDelivery)
      
      if (response.success) {
        if (onStatusUpdate) {
          onStatusUpdate(newStatus)
        }
      } else {
        setError(response.error || 'Erreur lors de la mise à jour')
      }
    } catch (err) {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
        {statusDisplay.label}
      </span>

      {actions.canProgress && (
        <button
          onClick={() => handleQuickAction('progress')}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-sm"
        >
          {loading ? '...' : 'Progresser'}
        </button>
      )}

      {actions.canCancel && (
        <button
          onClick={() => handleQuickAction('cancel')}
          disabled={loading}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 text-sm"
        >
          {loading ? '...' : 'Annuler'}
        </button>
      )}

      {actions.canReturn && (
        <button
          onClick={() => handleQuickAction('return')}
          disabled={loading}
          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 text-sm"
        >
          {loading ? '...' : 'Retour'}
        </button>
      )}

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  )
}
