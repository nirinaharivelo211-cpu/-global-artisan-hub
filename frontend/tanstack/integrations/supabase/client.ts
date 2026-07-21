import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let clientInstance: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) {
    return clientInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[Supabase Warning] VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY manquant. Utilisation du fallback No-Op."
    );

    return new Proxy({} as SupabaseClient<Database>, {
      get(_target, prop) {
        if (prop === 'auth') {
          return new Proxy({}, {
            get() {
              return () => Promise.resolve({ data: null, error: null });
            }
          });
        }
        return () => Promise.resolve({ data: null, error: null });
      }
    });
  }

  clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return clientInstance;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop: keyof SupabaseClient<Database>) {
    const instance = getSupabaseClient();
    const value = instance[prop];

    if (typeof value === 'function') {
      return value.bind(instance);
    }

    return value;
  }
});
