import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { query } from "../db.server";
import { getServerConfig } from "../config.server";

/**
 * Example server function that queries the local PostgreSQL database.
 * Used when DB_MODE=local. Falls back gracefully when DB is not configured.
 */

export const getProductsFromDb = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = getServerConfig();
    if (config.dbMode !== "local") {
      return { source: "supabase", products: [] };
    }
    try {
      const rows = await query`
        SELECT * FROM public.products ORDER BY created_at DESC
      `;
      return { source: "local", products: rows as any[] };
    } catch (err) {
      console.error("DB query failed:", err);
      return { source: "local", products: [], error: String(err) };
    }
  });

export const getProductFromDb = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    if (config.dbMode !== "local") {
      return null;
    }
    try {
      const rows = await query`
        SELECT * FROM public.products WHERE id = ${data.id}
      `;
      return (rows as any[])[0] ?? null;
    } catch {
      return null;
    }
  });

export const getArtisansFromDb = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = getServerConfig();
    if (config.dbMode !== "local") {
      return [];
    }
    try {
      const rows = await query`
        SELECT * FROM public.artisans ORDER BY name ASC
      `;
      return rows as any[];
    } catch {
      return [];
    }
  });

export const getWorkshopsFromDb = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = getServerConfig();
    if (config.dbMode !== "local") {
      return [];
    }
    try {
      const rows = await query`
        SELECT * FROM public.workshops ORDER BY title ASC
      `;
      return rows as any[];
    } catch {
      return [];
    }
  });

export const getCategoriesFromDb = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = getServerConfig();
    if (config.dbMode !== "local") return [];
    try {
      const rows = await query`
        SELECT DISTINCT category FROM public.products ORDER BY category
      `;
      return (rows as any[]).map(r => r.category);
    } catch {
      return [];
    }
  });

export const getCountriesFromDb = createServerFn({ method: "GET" })
  .handler(async () => {
    const config = getServerConfig();
    if (config.dbMode !== "local") return [];
    try {
      const rows = await query`
        SELECT DISTINCT country FROM public.products ORDER BY country
      `;
      return (rows as any[]).map(r => r.country);
    } catch {
      return [];
    }
  });
