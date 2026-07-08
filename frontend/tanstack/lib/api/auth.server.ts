import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { unsafeQuery } from "../db.server";
import { getServerConfig } from "../config.server";
import type { DbUser, DbUserRole, DbSession } from "../types";
import { AppError } from "../types";

export const checkDbMode = createServerFn({ method: "GET" }).handler(async () => {
  return { dbMode: getServerConfig().dbMode };
});

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export const registerUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6).max(72),
      fullName: z.string().trim().min(2).max(80),
      role: z.enum(["client", "artisan"]).default("client"),
    })
  )
  .handler(async ({ data }) => {
    try {
      const config = getServerConfig();
      if (config.dbMode !== "local") {
        return { user: null, token: null, error: "Supabase mode: use direct Supabase auth" };
      }

      const existing = await unsafeQuery<DbUser>(
        `SELECT id FROM public.users WHERE email = $1`,
        [data.email]
      );
      if (existing.length > 0) {
        return { user: null, token: null, error: "Un compte avec cet email existe déjà" };
      }

      const salt = generateSalt();
      const hashed = hashPassword(data.password, salt);
      const storedHash = `${salt}:${hashed}`;

      const users = await unsafeQuery<DbUser>(
        `INSERT INTO public.users (email, full_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, full_name`,
        [data.email, data.fullName, storedHash]
      );
      const user = users[0];

      if (data.role === "artisan") {
        await unsafeQuery(
          `INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'artisan') ON CONFLICT (user_id, role) DO NOTHING`,
          [user.id]
        );
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await unsafeQuery(
        `INSERT INTO public.sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      return { user, token, error: null };
    } catch (e) { throw AppError.from(e); }
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    try {
      const config = getServerConfig();
      if (config.dbMode !== "local") {
        return { user: null, token: null, error: "Supabase mode: use direct Supabase auth" };
      }

      const users = await unsafeQuery<DbUser & { password_hash: string }>(
        `SELECT id, email, full_name, password_hash FROM public.users WHERE email = $1`,
        [data.email]
      );
      const user = users[0];
      if (!user) {
        return { user: null, token: null, error: "Email ou mot de passe incorrect" };
      }

      const [salt, storedHash] = (user.password_hash as string).split(":");
      const inputHash = hashPassword(data.password, salt);

      if (inputHash !== storedHash) {
        return { user: null, token: null, error: "Email ou mot de passe incorrect" };
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await unsafeQuery(
        `INSERT INTO public.sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      return {
        user: { id: user.id, email: user.email, full_name: user.full_name },
        token,
        error: null,
      };
    } catch (e) { throw AppError.from(e); }
  });

export const getCurrentUser = createServerFn({ method: "GET" })
  .validator(
    z.object({ token: z.string().optional() })
  )
  .handler(async ({ data }) => {
    try {
      const config = getServerConfig();
      if (config.dbMode !== "local" || !data.token) return null;

      await unsafeQuery("DELETE FROM public.sessions WHERE expires_at < now()", []);

      const rows = await unsafeQuery<DbUser & { full_name: string }>(
        `SELECT u.id, u.email, u.full_name
         FROM public.sessions s
         JOIN public.users u ON u.id = s.user_id
         WHERE s.token = $1 AND s.expires_at > now()`,
        [data.token]
      );
      const session = rows[0];
      if (!session) return null;

      const roleRows = await unsafeQuery<{ role: string }>(
        `SELECT role FROM public.user_roles WHERE user_id = $1`,
        [session.id]
      );
      const roles = roleRows.map((r) => r.role);

      return { user: session, roles };
    } catch (e) { throw AppError.from(e); }
  });

export const updateProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string(),
      fullName: z.string().trim().min(2).max(80).optional(),
      phone: z.string().max(30).optional(),
      country: z.string().max(80).optional(),
      city: z.string().max(80).optional(),
      language: z.string().max(10).optional(),
      currency: z.string().max(10).optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const config = getServerConfig();
      if (config.dbMode !== "local") {
        return { error: "Supabase mode: use direct Supabase API" };
      }
      const sets: string[] = [];
      const params: (string | undefined)[] = [];
      let idx = 1;
      if (data.fullName !== undefined) { sets.push(`full_name = $${idx}`); params.push(data.fullName); idx++; }
      if (data.phone !== undefined) { sets.push(`phone = $${idx}`); params.push(data.phone); idx++; }
      if (data.country !== undefined) { sets.push(`country = $${idx}`); params.push(data.country); idx++; }
      if (data.city !== undefined) { sets.push(`city = $${idx}`); params.push(data.city); idx++; }
      if (data.language !== undefined) { sets.push(`language = $${idx}`); params.push(data.language); idx++; }
      if (data.currency !== undefined) { sets.push(`currency = $${idx}`); params.push(data.currency); idx++; }
      if (sets.length === 0) return { error: "No fields to update" };
      params.push(data.userId);
      await unsafeQuery(`UPDATE public.users SET ${sets.join(", ")} WHERE id = $${idx}`, params);
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });

export const logoutUser = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    try {
      await unsafeQuery(`DELETE FROM public.sessions WHERE token = $1`, [data.token]);
      return { success: true };
    } catch (e) { throw AppError.from(e); }
  });
