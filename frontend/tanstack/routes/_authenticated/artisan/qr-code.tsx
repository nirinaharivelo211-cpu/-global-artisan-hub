import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useRoles } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api/db.server";
import { Loader2, ShieldAlert, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/artisan/qr-code")({
  head: () => ({ meta: [{ title: "QR Code — TISSAGE" }] }),
  component: ArtisanQRCode,
});

function ArtisanQRCode() {
  const { user } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useRoles(user);
  const isArtisan = roles?.includes("artisan");

  const { data: products } = useQuery({
    enabled: isArtisan,
    queryKey: ["artisan-qr-products", user?.id],
    queryFn: async () => getProducts({}),
  });

  if (rolesLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isArtisan) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rouge" />
        <p className="mt-4 font-semibold">Accès réservé aux artisans.</p>
      </div>
    );
  }

  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/artisan/${user?.id}` : "";
  const myProducts = (products ?? []).filter((p: any) => p.user_id === user?.id || p.artisan === user?.full_name);

  function downloadQR(url: string, label: string) {
    const canvas = document.createElement("canvas");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="white" rx="10"/>
      <text x="100" y="100" text-anchor="middle" font-size="12" fill="black">QR: ${label}</text>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${label}.svg`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold">QR Codes</h1>
      <p className="mt-1 text-muted-foreground">Générez des QR codes pour votre profil et vos produits.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Profil artisan</h2>
            <p className="text-xs text-muted-foreground">{profileUrl}</p>
          </div>
          <button onClick={() => downloadQR(profileUrl, `profil-${user?.id?.slice(0, 8)}`)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Télécharger
          </button>
        </div>
      </div>

      {(myProducts as any[]).length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="font-display text-lg font-bold">Produits ({myProducts.length})</h2>
          {(myProducts as any[]).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <img src={p.img ?? p.image} alt={p.name} className="h-12 w-12 rounded-md object-cover" />
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{Number(p.price).toFixed(2)} €</div>
                </div>
              </div>
              <button onClick={() => downloadQR(`${profileUrl}/${p.id}`, `produit-${p.id.slice(0, 8)}`)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
                <Download className="h-4 w-4" /> QR
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
