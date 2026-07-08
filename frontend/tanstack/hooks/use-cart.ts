import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { checkDbMode } from "@/lib/api/auth.server";
import { getCartItems as getCartItemsDb, addToCart as addToCartDb, updateCartItem as updateCartItemDb, removeCartItem as removeCartItemDb } from "@/lib/api/db.server";

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  artisan_name: string | null;
  unit_price: number;
  quantity: number;
  created_at: string;
};

let _cartMode: "local" | "supabase" | null = null;

async function getCartMode(): Promise<"local" | "supabase"> {
  if (_cartMode) return _cartMode;
  try {
    const res = await checkDbMode();
    _cartMode = res.dbMode;
    return res.dbMode;
  } catch {
    return "supabase";
  }
}

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) return [] as CartItem[];
      const mode = await getCartMode();
      if (mode === "local") {
        const result = await getCartItemsDb({ data: { userId: user.id } });
        return (result ?? []) as CartItem[];
      }
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CartItem[];
    },
  });
}

export function useAddToCart() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (item: {
      product_id: string;
      product_name: string;
      product_image: string | null;
      artisan_name: string | null;
      unit_price: number;
      quantity: number;
    }) => {
      if (!user) throw new Error("AUTH_REQUIRED");
      const mode = await getCartMode();
      if (mode === "local") {
        return addToCartDb({
          data: {
            userId: user.id,
            productId: item.product_id,
            productName: item.product_name,
            productImage: item.product_image,
            artisanName: item.artisan_name,
            unitPrice: item.unit_price,
            quantity: item.quantity,
          },
        });
      }
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", item.product_id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          ...item,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Produit ajouté au panier");
    },
    onError: (e: Error) => {
      if (e.message === "AUTH_REQUIRED") {
        toast.error("Connectez-vous pour ajouter au panier");
        navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      } else {
        toast.error(e.message || "Erreur lors de l'ajout");
      }
    },
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const mode = await getCartMode();
      if (mode === "local") {
        return updateCartItemDb({ data: { id, quantity } });
      }
      if (quantity <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const mode = await getCartMode();
      if (mode === "local") {
        return removeCartItemDb({ data: { id } });
      }
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Article retiré");
    },
  });
}
