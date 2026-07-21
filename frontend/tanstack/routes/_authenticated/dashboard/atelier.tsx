import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "../../../hooks/use-auth.ts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAtelier, upsertAtelier } from "../../../lib/api/db.server.ts";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Store } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/atelier")({
  head: () => ({ meta: [{ title: "Mon atelier — TISSAGE" }] }),
  component: MonAtelier,
});

function MonAtelier() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: atelier, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["atelier", user?.id],
    queryFn: async () => {
      if (!user) return null;
      return getAtelier({ data: { userId: user.id } });
    },
  });

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    description: "",
    photoCouverture: "",
    adresse: "",
    ville: "",
    pays: "",
    telephone: "",
    email: "",
    siteWeb: "",
    specialite: "",
  });

  useEffect(() => {
    if (atelier) {
      setForm({
        nom: atelier.name ?? "",
        description: atelier.bio ?? "",
        photoCouverture: atelier.photo_couverture ?? atelier.image ?? "",
        adresse: atelier.adresse ?? "",
        ville: atelier.city ?? "",
        pays: atelier.country ?? "",
        telephone: atelier.telephone ?? "",
        email: atelier.email_contact ?? "",
        siteWeb: atelier.site_web ?? "",
        specialite: atelier.specialty ?? "",
      });
    }
  }, [atelier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await upsertAtelier({
        data: {
          userId: user.id,
          name: form.nom,
          specialty: form.specialite,
          country: form.pays,
          city: form.ville,
          bio: form.description,
          photoCouverture: form.photoCouverture,
          adresse: form.adresse,
          telephone: form.telephone,
          emailContact: form.email,
          siteWeb: form.siteWeb,
        },
      });
      toast.success("Atelier mis à jour !");
      qc.invalidateQueries({ queryKey: ["atelier", user.id] });
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Mon atelier</h2>
          <p className="text-sm text-muted-foreground">
            Informations de votre boutique visible par les clients
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
      >
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            Nom de l'atelier
          </span>
          <input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="Atelier Tissage de..."
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Spécialité
          </span>
          <input
            value={form.specialite}
            onChange={(e) => setForm({ ...form, specialite: e.target.value })}
            placeholder="Tissage, Sculpture, Vannerie..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            Description
          </span>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Décrivez votre atelier, votre savoir-faire, votre histoire..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            Photo de couverture (URL)
          </span>
          <input
            value={form.photoCouverture}
            onChange={(e) =>
              setForm({ ...form, photoCouverture: e.target.value })
            }
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
          {form.photoCouverture && (
            <img
              src={form.photoCouverture}
              alt="Aperçu"
              className="mt-2 h-32 w-full rounded-lg object-cover"
            />
          )}
        </label>

        <div className="sm:col-span-2 border-t border-border pt-4">
          <h3 className="text-sm font-semibold mb-3">Coordonnées</h3>
        </div>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            Adresse
          </span>
          <input
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Ville</span>
          <input
            value={form.ville}
            onChange={(e) => setForm({ ...form, ville: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Pays</span>
          <input
            value={form.pays}
            onChange={(e) => setForm({ ...form, pays: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Téléphone
          </span>
          <input
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">
            Site web
          </span>
          <input
            value={form.siteWeb}
            onChange={(e) => setForm({ ...form, siteWeb: e.target.value })}
            placeholder="https://..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </label>

        <div className="sm:col-span-2 flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
