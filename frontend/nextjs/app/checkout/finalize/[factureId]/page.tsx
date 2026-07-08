"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMesureLabel } from "@/lib/mesure-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ordersApi, paymentsApi } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useAppToast } from "@/context/toast-context";
import { CheckCircle, AlertCircle, ArrowLeft, CreditCard, Truck } from "lucide-react";
import Image from "next/image";

interface OrderDetails {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  total_amount: number;
  delivery_fee: number;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
    color?: string;
    size?: string;
    weight?: number;
    type_mesure?: string;
  }>;
  created_at: string;
}

interface PaymentDetails {
  method: string;
  amount_collected: number;
  payment_status: string;
  notes?: string;
}

export default function FinalizePaymentPage() {
  const { factureId } = useParams<{ factureId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useAppToast();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    method: "cash",
    amount_collected: 0,
    payment_status: "paid",
    notes: ""
  });

  useEffect(() => {
    if (!user || user.role !== 'livreur') {
      router.push("/login");
      return;
    }

    if (factureId) {
      loadOrderDetails();
    }
  }, [factureId, user, router]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await ordersApi.getOrderDetails(Number(factureId));
      if (response.success && response.data) {
        const orderData = response.data as OrderDetails;
        setOrderDetails(orderData);
        setPaymentDetails(prev => ({
          ...prev,
          amount_collected: orderData.total_amount
        }));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des détails de la commande:", error);
      addToast({
        title: "Erreur",
        description: "Impossible de charger les détails de la commande",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizePayment = async () => {
    if (!orderDetails) return;

    try {
      setProcessingPayment(true);

      const paymentData = {
        facture_id: Number(factureId),
        payment_method: paymentDetails.method,
        amount_collected: paymentDetails.amount_collected,
        payment_status: paymentDetails.payment_status,
        notes: paymentDetails.notes,
        delivery_person_id: Number(user.id)
      };

      const response = await paymentsApi.finalizePayment(paymentData);

      if (response.success) {
        addToast({
          title: "Paiement finalisé",
          description: "Le paiement a été enregistré avec succès",
          variant: "success"
        });
        
        // Rediriger vers la page des livraisons du livreur
        router.push("/dashboard/livreur/deliveries");
      } else {
        throw new Error(response.error || "Erreur lors de la finalisation du paiement");
      }
    } catch (error) {
      console.error("Erreur lors de la finalisation du paiement:", error);
      addToast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de finaliser le paiement",
        variant: "error"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="livreur">
        <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
          <div className="mx-auto max-w-4xl">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!orderDetails) {
    return (
      <DashboardLayout role="livreur">
        <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
          <div className="mx-auto max-w-4xl">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Commande introuvable ou accès non autorisé.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="livreur">
      <div className="min-h-screen bg-[#f5f6f8] px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* En-tête */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Finalisation du paiement
              </h1>
              <p className="text-sm text-gray-600">
                Commande #{orderDetails.order_number}
              </p>
            </div>
          </div>

          {/* Alertes de statut */}
          {orderDetails.status === 'delivered' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Cette commande a déjà été livrée et le paiement finalisé.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Détails de la commande */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations client */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Informations de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Client</Label>
                    <p className="text-gray-900">{orderDetails.customer_name}</p>
                    <p className="text-sm text-gray-600">{orderDetails.customer_email}</p>
                    <p className="text-sm text-gray-600">{orderDetails.customer_phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Adresse de livraison</Label>
                    <p className="text-gray-900">{orderDetails.delivery_address}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Statut actuel</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">
                        {orderDetails.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Articles de la commande */}
              <Card>
                <CardHeader>
                  <CardTitle>Articles de la commande</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderDetails.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                          <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.color && (
                              <Badge variant="outline" className="text-xs">
                                {item.color}
                              </Badge>
                            )}
                            {(() => {
                              const parts: string[] = []
                              if (item.size) parts.push(`${getMesureLabel(item.type_mesure)} ${item.size}`)
                              if (item.weight && Number(item.weight) > 0) parts.push(`${Number(item.weight)} kg`)
                              return parts.length > 0 ? <span className="text-xs text-muted-foreground">{parts.join(" — ")}</span> : null
                            })()}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            Ar {(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Ar {item.price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Finalisation du paiement */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Finalisation du paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="payment_method">Méthode de paiement</Label>
                    <select
                      id="payment_method"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={paymentDetails.method}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, method: e.target.value }))}
                    >
                      <option value="cash">Espèces</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="card">Carte bancaire</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="amount_collected">Montant encaissé (Ar)</Label>
                    <Input
                      id="amount_collected"
                      type="number"
                      value={paymentDetails.amount_collected}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, amount_collected: Number(e.target.value) }))}
                      placeholder="Montant encaissé"
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_status">Statut du paiement</Label>
                    <select
                      id="payment_status"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={paymentDetails.payment_status}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, payment_status: e.target.value }))}
                    >
                      <option value="paid">Payé</option>
                      <option value="partial">Partiellement payé</option>
                      <option value="pending">En attente</option>
                      <option value="failed">Échec</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (optionnel)</Label>
                    <textarea
                      id="notes"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={paymentDetails.notes}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes sur le paiement ou la livraison..."
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total commande:</span>
                      <span className="font-medium">Ar {orderDetails.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Frais de livraison:</span>
                      <span className="font-medium">Ar {orderDetails.delivery_fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total à encaisser:</span>
                      <span>Ar {orderDetails.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleFinalizePayment}
                    disabled={processingPayment || orderDetails.status === 'delivered'}
                    className="w-full"
                  >
                    {processingPayment ? (
                      "Traitement en cours..."
                    ) : orderDetails.status === 'delivered' ? (
                      "Déjà finalisé"
                    ) : (
                      "Finaliser le paiement"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
