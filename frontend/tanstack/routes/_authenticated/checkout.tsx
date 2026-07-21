import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "../../hooks/use-cart";
import { useAuth } from "../../hooks/use-auth";
import { supabase } from "../../integrations/supabase/client";
import { createFullOrderWithWorkflow, getHubs, getZonesByVille } from "../../lib/api/db.server";
import { checkDbMode } from "../../lib/api/auth.server";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CreditCard, Truck, ShieldCheck, Loader2, MapPin, Building2, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "Paiement — TISSAGE" }] }),
  component: Checkout,
});

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(30),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  postal_code: z.string().trim().max(20).optional(),
  country: z.string().trim().min(2).max(80),
});

type PaymentMethod = "card" | "paypal" | "mvola" | "orange_money" | "cash_on_delivery" | "mobile_money";

function Checkout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [pm, setPm] = useState<PaymentMethod>("card");
  const [addr, setAddr] = useState({ full_name: "", phone: "", line1: "", line2: "", city: "", postal_code: "", country: "Madagascar" });
  const [region, setRegion] = useState("Analamanga");
  const [mode, setMode] = useState<"local" | "supabase">("supabase");

  const { data: hubs } = useQuery({ queryKey: ["hubs"], queryFn: async () => getHubs({}) });
  const { data: zones } = useQuery({ queryKey: ["zones", addr.city], enabled: addr.city.length > 0, queryFn: async () => getZonesByVille({ data: { ville: addr.city } }) });

  useEffect(() => {
    checkDbMode().then((r) => setMode(r.dbMode)).catch(() => {});
  }, []);

  const subtotal = cart?.reduce((s, i) => s + i.unit_price * i.quantity, 0) ?? 0;
  const shipping = zones && zones.length > 0 ? 0 : subtotal > 0 ? 9.9 : 0;
  const total = subtotal + shipping;

  const matchedHub = useMemo(() => {
    if (zones && zones.length > 0) return hubs?.find((h: any) => h.id === zones[0].hub_id);
    const byRegion = (hubs ?? []).find((h: any) => h.region?.toLowerCase() === region.toLowerCase());
    return byRegion ?? (hubs ?? [])[0];
  }, [zones, hubs, region]);

  const detectedPm: PaymentMethod = useMemo(() => {
    if (matchedHub?.support_cod) return "cash_on_delivery" as any;
    const codCities = ["antananarivo", "tana"];
    if (codCities.includes(addr.city.toLowerCase())) return "cash_on_delivery" as any;
    const codRegions = ["analamanga"];
    if (codRegions.includes(region.toLowerCase())) return "cash_on_delivery" as any;
    return "mobile_money" as any;
  }, [matchedHub, addr.city, region]);

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !cart || cart.length === 0) return;
    setSubmitting(true);
    try {
      const parsed = addressSchema.parse(addr);

      if (mode === "local") {
        await createFullOrderWithWorkflow({
          data: {
            userId: user.id,
            subtotal,
            total,
            paymentMethod: detectedPm,
            shippingAddress: parsed,
            region,
            city: addr.city,
            items: cart.map((i) => ({
              product_id: i.product_id,
              product_name: i.product_name,
              product_image: i.product_image,
              artisan_name: i.artisan_name,
              unit_price: i.unit_price,
              quantity: i.quantity,
            })),
          },
        });
      } else {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            status: "pending",
            subtotal,
            shipping,
            total,
            currency: "EUR",
            payment_method: detectedPm,
            shipping_address: parsed,
            region,
          })
          .select()
          .single();
        if (orderErr) throw orderErr;

        const items = cart.map((i) => ({
          order_id: order.id,
          product_id: i.product_id,
          product_name: i.product_name,
          product_image: i.product_image,
          artisan_name: i.artisan_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_total: i.unit_price * i.quantity,
        }));
        const { error: itemsErr } = await supabase.from("order_items").insert(items);
        if (itemsErr) throw itemsErr;

        await supabase.from("cart_items").delete().eq("user_id", user.id);
      }

      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(detectedPm === "cash_on_delivery" ? "Commande confirmée ! Paiement à la livraison." : "Commande créée ! Vous allez recevoir les instructions de paiement Mobile Money.");
      navigate({ to: "/orders" });
    } catch (err) {
      const msg = err instanceof z.ZodError ? "Vérifiez l'adresse de livraison" : err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-muted-foreground">Votre panier est vide.</p>
        <Link to="/marketplace" className="mt-4 inline-block text-primary underline">Retour au catalogue</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleOrder} className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><MapPin className="h-5 w-5 text-terre" /> Adresse de livraison</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet *" value={addr.full_name} onChange={(v) => setAddr({ ...addr, full_name: v })} required />
              <Field label="Téléphone *" value={addr.phone} onChange={(v) => setAddr({ ...addr, phone: v })} required />
              <Field label="Adresse *" value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} required className="sm:col-span-2" />
              <Field label="Complément" value={addr.line2} onChange={(v) => setAddr({ ...addr, line2: v })} className="sm:col-span-2" />
              <Field label="Ville *" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} required />
              <Field label="Région" value={region} onChange={(v) => setRegion(v)} required />
              <Field label="Code postal" value={addr.postal_code} onChange={(v) => setAddr({ ...addr, postal_code: v })} />
              <Field label="Pays *" value={addr.country} onChange={(v) => setAddr({ ...addr, country: v })} required />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Building2 className="h-5 w-5 text-terre" /> Hub de livraison</h2>
            {matchedHub ? (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 font-semibold">{matchedHub.nom}</div>
                <p className="text-xs text-muted-foreground">{matchedHub.ville}, {matchedHub.region}</p>
                {matchedHub.support_cod && <span className="mt-1 inline-block rounded bg-vert/10 px-2 py-0.5 text-xs text-vert">Paiement à la livraison disponible</span>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {matchedHub.mvola_number && <span className="rounded bg-vert/5 px-2 py-0.5">MVola: {matchedHub.mvola_number}</span>}
                  {matchedHub.orange_money_number && <span className="rounded bg-or/5 px-2 py-0.5">Orange: {matchedHub.orange_money_number}</span>}
                  {matchedHub.airtel_money_number && <span className="rounded bg-rouge/5 px-2 py-0.5">Airtel: {matchedHub.airtel_money_number}</span>}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Hub déterminé automatiquement selon votre région.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Truck className="h-5 w-5 text-terre" /> Mode de livraison</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { id: "hub", l: "Livraison hub", d: zones && zones.length > 0 ? `${zones[0].delai_estime_jours ?? 3} jours` : "2–5 jours", p: shipping, desc: "Ramassage en hub régional" },
                { id: "dhl", l: "DHL Express", d: "3–5 jours", p: 9.9, desc: "Livraison internationale" },
                { id: "fedex", l: "FedEx International", d: "5–7 jours", p: 12.5, desc: "Livraison internationale" },
              ].map((c) => (
                <label key={c.id} className={`cursor-pointer rounded-lg border p-4 hover:bg-muted ${c.id === "hub" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="carrier" defaultChecked={c.id === "hub"} className="accent-primary" />
                  <div className="mt-2 font-semibold">{c.l}</div>
                  <div className="text-xs text-muted-foreground">{c.d}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                  <div className="mt-2 font-bold text-terre">{c.p.toFixed(2)} €</div>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">{detectedPm === "cash_on_delivery" ? <Truck className="h-5 w-5 text-terre" /> : <Smartphone className="h-5 w-5 text-terre" />} Paiement</h2>
            {(detectedPm === "cash_on_delivery") ? (
              <div className="mt-3 rounded-lg border border-vert/20 bg-vert/5 p-4">
                <p className="text-sm font-semibold text-vert">Paiement à la livraison (COD)</p>
                <p className="mt-1 text-xs text-muted-foreground">Vous paierez en espèces ou par Mobile Money à la réception de votre commande.</p>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm">Mode de paiement : <span className="font-semibold">Mobile Money</span></p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(["mvola", "orange_money", "airtel_money"] as const).map((id) => (
                    <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${pm === id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                      <input type="radio" name="pm" checked={pm === id} onChange={() => setPm(id)} className="accent-primary" />
                      <span className="text-sm font-medium capitalize">{id.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-vert" /> Les instructions de paiement vous seront communiquées après confirmation.</p>
              </>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold">Votre commande</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.map((i) => (
              <li key={i.id} className="flex gap-3">
                <img src={i.product_image ?? ""} alt="" width={48} height={48} className="h-12 w-12 rounded object-cover" />
                <div className="flex-1">
                  <div className="line-clamp-1 font-medium">{i.product_name}</div>
                  <div className="text-xs text-muted-foreground">× {i.quantity}</div>
                </div>
                <div className="font-semibold">{(i.unit_price * i.quantity).toFixed(2)} €</div>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt>Sous-total</dt><dd>{subtotal.toFixed(2)} €</dd></div>
            <div className="flex justify-between"><dt>Livraison</dt><dd>{shipping.toFixed(2)} €</dd></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd className="text-terre">{total.toFixed(2)} €</dd></div>
          </dl>
          <div className="flex items-center gap-2 rounded-lg border border-vert/20 bg-vert/5 px-3 py-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-vert" />
            <span className="text-vert font-medium">{detectedPm === "cash_on_delivery" ? "Paiement à la livraison" : "Paiement Mobile Money"}</span>
          </div>
          <button type="submit" disabled={submitting} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirmer la commande</>}
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">En validant, vous acceptez nos CGV et notre politique de retour.</p>
        </aside>
      </form>
  );
}

function Field({ label, value, onChange, required, className }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}
