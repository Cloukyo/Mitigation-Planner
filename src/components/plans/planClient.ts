"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthState = {
  user: User | null;
  token: string | null;
  error?: string;
};

export async function getPlanAuthState(): Promise<AuthState> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) return { user: null, token: null, error: error.message };
    return { user: data.session?.user ?? null, token: data.session?.access_token ?? null };
  } catch (error) {
    return {
      user: null,
      token: null,
      error: error instanceof Error ? error.message : "Supabase is not configured."
    };
  }
}

export async function signInWithEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  const redirectTo = typeof window === "undefined" ? undefined : window.location.href;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function authedFetch(path: string, token: string, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
}
