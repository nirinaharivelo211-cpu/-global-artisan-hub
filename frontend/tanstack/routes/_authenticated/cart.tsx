import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart, useUpdateCartItem, useRemoveCartItem } from "@/hooks/use-cart";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Mon panier — TISSAGE" }] }),
  component: CartPage,
});

function CartPage() {
  const { data: cart, isLoading } = useCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();

  const subtotal = cart?.reduce((s, i) => s + i.unit_price * i.quantity, 0) ?? 0;
  const shipping = subtotal > 0 ? 9.9 : 0;
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Mon panier</h1>
        <p className="mt-1 text-muted-foreground">{cart?.length ?? 0} article(s)</p>

        {isLoading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !cart || cart.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Votre panier est vide.</p>
            <Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Explorer le catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <ul className="space-y-3">
              {cart.map((it) => (
                <li key={it.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <img src={it.product_image ?? ""} alt={it.product_name} width={96} height={96} className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to="/product/$id" params={{ id: it.product_id }} className="line-clamp-1 font-semibold hover:text-primary">{it.product_name}</Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">par {it.artisan_name}</p>
                      </div>
                      <button onClick={() => remove.mutate(it.id)} className="text-muted-foreground hover:text-rouge"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-auto flex items-end justify-between">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button onClick={() => update.mutate({ id: it.id, quantity: it.quantity - 1 })} className="grid h-8 w-8 place-items-center hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                        <button onClick={() => update.mutate({ id: it.id, quantity: it.quantity + 1 })} className="grid h-8 w-8 place-items-center hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="font-display text-lg font-bold text-terre">{(it.unit_price * it.quantity).toFixed(2)} €</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="h-fit rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-bold">Récapitulatif</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Sous-total</dt><dd>{subtotal.toFixed(2)} €</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Livraison estimée</dt><dd>{shipping.toFixed(2)} €</dd></div>
                <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total TTC</dt><dd className="text-terre">{total.toFixed(2)} €</dd></div>
              </dl>
              <Link to="/checkout" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">
                Passer commande <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/marketplace" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">Continuer mes achats</Link>
            </aside>
          </div>
        )}
      </div>
  );
}

